import { ungzip } from 'pako';
import JSZip from 'jszip';
import { PanOsConfig, SecurityRule, AddressObject, AddressGroupObject, ServiceObject, DecryptionRule, DeviceHardeningSettings, ObjectLocation, ManagementDetection } from '../types/panos';

/**
 * Reads a POSIX TAR archive from a Uint8Array.
 * Returns map of filename -> string content or Uint8Array.
 */
function extractTarFiles(tarBytes: Uint8Array): { name: string; content: string }[] {
  const files: { name: string; content: string }[] = [];
  let offset = 0;
  const decoder = new TextDecoder('utf-8');

  while (offset < tarBytes.length - 512) {
    // 512 byte header block
    const header = tarBytes.subarray(offset, offset + 512);

    // End of archive is represented by two consecutive 512-byte zero blocks
    let isAllZeros = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        isAllZeros = false;
        break;
      }
    }
    if (isAllZeros) break;

    // Read filename (bytes 0 to 99)
    let fileNameEnd = 0;
    while (fileNameEnd < 100 && header[fileNameEnd] !== 0) {
      fileNameEnd++;
    }
    const fileName = decoder.decode(header.subarray(0, fileNameEnd)).trim();

    // Read size (bytes 124 to 135) - octal string
    let sizeEnd = 124;
    while (sizeEnd < 136 && header[sizeEnd] !== 0 && header[sizeEnd] !== 32) {
      sizeEnd++;
    }
    const sizeOctal = decoder.decode(header.subarray(124, sizeEnd)).trim();
    const size = parseInt(sizeOctal, 8) || 0;

    offset += 512;

    if (size > 0 && fileName) {
      // If file is an XML or text config file
      if (fileName.endsWith('.xml') || fileName.endsWith('.txt') || fileName.includes('config') || fileName.includes('info')) {
        const fileData = tarBytes.subarray(offset, offset + size);
        try {
          const content = decoder.decode(fileData);
          files.push({ name: fileName, content });
        } catch {
          // ignore binary decoding errors
        }
      }
    }

    // Move to next 512-byte block boundary
    const padding = (512 - (size % 512)) % 512;
    offset += size + padding;
  }

  return files;
}

/**
 * Extracts the merged or running configuration XML string from an uploaded file.
 */
export async function extractConfigXmlFromFile(file: File): Promise<{ xmlString: string; fileName: string; detectedFileInArchive?: string }> {
  const fileName = file.name.toLowerCase();

  // Case 1: Direct XML upload
  if (fileName.endsWith('.xml') || fileName.endsWith('.txt')) {
    const text = await file.text();
    return { xmlString: text, fileName: file.name };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Case 2: .tar.gz / .tgz archive (Standard Palo Alto TSF)
  if (fileName.endsWith('.tgz') || fileName.endsWith('.tar.gz') || fileName.endsWith('.gz')) {
    try {
      const decompressed = ungzip(bytes);
      const tarFiles = extractTarFiles(decompressed);

      // Look for preferred files in order:
      // 1. merged-config.xml
      // 2. running-config.xml
      // 3. candidate-config.xml
      // 4. any file ending in .xml containing <config
      const targetFiles = [
        'merged-config.xml',
        'running-config.xml',
        'saved-configs/running-config.xml',
        'saved-configs/merged-config.xml',
        'device-config.xml',
      ];

      for (const target of targetFiles) {
        const match = tarFiles.find((f) => f.name.toLowerCase().endsWith(target.toLowerCase()));
        if (match && match.content.includes('<config')) {
          return { xmlString: match.content, fileName: file.name, detectedFileInArchive: match.name };
        }
      }

      // Fallback: any XML file containing <config
      const anyConfigXml = tarFiles.find((f) => f.content.includes('<config') || f.content.includes('<devices>'));
      if (anyConfigXml) {
        return { xmlString: anyConfigXml.content, fileName: file.name, detectedFileInArchive: anyConfigXml.name };
      }

      throw new Error('Decompressed TSF archive successfully, but could not locate running-config.xml or merged-config.xml.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to extract .tar.gz archive: ${message}`);
    }
  }

  // Case 3: .zip archive
  if (fileName.endsWith('.zip')) {
    try {
      const zip = await JSZip.loadAsync(bytes);
      const fileNames = Object.keys(zip.files);

      const target = fileNames.find((name) => {
        const lower = name.toLowerCase();
        return lower.endsWith('merged-config.xml') || lower.endsWith('running-config.xml') || lower.endsWith('.xml');
      });

      if (target) {
        const xml = await zip.files[target].async('text');
        return { xmlString: xml, fileName: file.name, detectedFileInArchive: target };
      }

      throw new Error('ZIP archive did not contain running-config.xml or merged-config.xml.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to extract ZIP archive: ${message}`);
    }
  }

  // Fallback attempt: try reading as plain text
  const text = await file.text();
  if (text.includes('<config') || text.includes('<devices>')) {
    return { xmlString: text, fileName: file.name };
  }

  throw new Error('Unsupported file format. Please upload a Palo Alto .tgz / .tar.gz Tech Support File, or a direct running-config.xml / merged-config.xml.');
}

/**
 * Helper to get text array from XML node children (e.g. <member>foo</member><member>bar</member>)
 */
function getMemberValues(parentElement: Element | null, tag = 'member'): string[] {
  if (!parentElement) return [];
  const members = Array.from(parentElement.getElementsByTagName(tag));
  if (members.length > 0) {
    return members.map((m) => m.textContent?.trim() || '').filter(Boolean);
  }
  // If not members, check direct text
  const text = parentElement.textContent?.trim();
  return text ? [text] : [];
}

/**
 * Walks up the XML tree to find where a rule/object is defined:
 * shared, a Panorama device-group, a firewall vsys, or the local config,
 * plus which rulebase (local, pre or post) a rule sits in.
 */
function locateNode(node: Element): ObjectLocation & { rulebase?: 'local' | 'pre' | 'post' } {
  let rulebase: 'local' | 'pre' | 'post' | undefined;
  let el: Element | null = node.parentElement;
  while (el) {
    const tag = el.tagName;
    if (tag === 'pre-rulebase') rulebase = 'pre';
    else if (tag === 'post-rulebase') rulebase = 'post';
    else if (tag === 'rulebase' && !rulebase) rulebase = 'local';

    const parentTag = el.parentElement?.tagName;
    if (tag === 'entry' && parentTag === 'device-group') {
      return { scope: 'device-group', name: el.getAttribute('name') || undefined, rulebase };
    }
    if (tag === 'entry' && parentTag === 'vsys') {
      return { scope: 'vsys', name: el.getAttribute('name') || undefined, rulebase };
    }
    if (tag === 'shared') return { scope: 'shared', rulebase };
    el = el.parentElement;
  }
  return { scope: 'local', rulebase };
}

function textOf(doc: Document, selector: string): string[] {
  return Array.from(doc.querySelectorAll(selector))
    .map((n) => n.textContent?.trim() || '')
    .filter(Boolean);
}

/**
 * Determines how the device in this TSF is managed:
 *  - panorama:          the TSF is from a Panorama (device-groups / templates present)
 *  - scm-managed:       a firewall managed by Strata Cloud Manager (heuristic markers)
 *  - panorama-managed:  a firewall pointing at one or more Panorama servers
 *  - standalone:        none of the above found
 * The UI lets the user override this, because a TSF does not always carry
 * enough information to be certain.
 */
export function detectManagement(doc: Document, xmlString: string, model: string): ManagementDetection {
  const dgNames = Array.from(doc.querySelectorAll('devices > entry > device-group > entry'))
    .map((e) => e.getAttribute('name') || '').filter(Boolean);
  const templateCount = doc.querySelectorAll('devices > entry > template > entry, devices > entry > template-stack > entry').length;
  const panoramaModel = /panorama|\bM-\d{2,4}\b/i.test(model);

  if (panoramaModel || dgNames.length > 0 || templateCount > 0) {
    const evidence: string[] = [];
    if (panoramaModel) evidence.push(`Model "${model}" is a Panorama appliance`);
    if (dgNames.length) evidence.push(`${dgNames.length} device group(s) defined: ${dgNames.slice(0, 4).join(', ')}${dgNames.length > 4 ? '…' : ''}`);
    if (templateCount) evidence.push(`${templateCount} template / template stack(s) defined`);
    return { mode: 'panorama', confidence: 'high', evidence };
  }

  const scmMarkers: { re: RegExp; label: string }[] = [
    { re: /<cloud-management[\s>/]/i, label: '<cloud-management> configuration present' },
    { re: /<cloud-mgmt[\s>/]/i, label: '<cloud-mgmt> configuration present' },
    { re: /strata[\s_-]*cloud[\s_-]*manager/i, label: 'Reference to Strata Cloud Manager in config' },
    { re: /\bscm[-_]managed\b/i, label: 'SCM-managed marker in config' },
  ];
  const scmHits = scmMarkers.filter((m) => m.re.test(xmlString)).map((m) => m.label);
  if (scmHits.length > 0) {
    return { mode: 'scm-managed', confidence: scmHits.length > 1 ? 'medium' : 'low', evidence: scmHits };
  }

  const panoramaServers = Array.from(new Set([
    ...textOf(doc, 'deviceconfig > system > panorama-server'),
    ...textOf(doc, 'deviceconfig > system > panorama-server-2'),
    ...textOf(doc, 'deviceconfig > system > panorama > local-panorama > panorama-server'),
    ...textOf(doc, 'deviceconfig > system > panorama > local-panorama > panorama-server-2'),
  ]));
  if (panoramaServers.length > 0) {
    return {
      mode: 'panorama-managed',
      confidence: 'high',
      evidence: [`Panorama server(s) configured: ${panoramaServers.join(', ')}`],
      panoramaServers,
    };
  }

  return {
    mode: 'standalone',
    confidence: 'medium',
    evidence: ['No Panorama server, device groups, or cloud-management settings found in the configuration'],
  };
}

/**
 * Parses PAN-OS XML Document into a typed PanOsConfig object.
 */
export function parsePanOsXml(xmlString: string, sourceFileName: string): PanOsConfig {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // Check XML parser errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    // If mild XML corruption, try cleaning headers
    throw new Error(`Invalid XML configuration in ${sourceFileName}: ${parseError.textContent?.slice(0, 150)}`);
  }

  // 1. Device Metadata & System Information
  const systemNode = doc.querySelector('deviceconfig > system');
  const hostname = systemNode?.querySelector('hostname')?.textContent?.trim() ||
                   doc.querySelector('system > hostname')?.textContent?.trim() ||
                   sourceFileName.replace(/\.(tgz|tar\.gz|zip|xml)$/i, '') || 'panos-firewall';

  const domain = systemNode?.querySelector('domain')?.textContent?.trim() || 'corp.local';
  const ipAddress = systemNode?.querySelector('ip-address')?.textContent?.trim() || '192.168.1.1';
  const netmask = systemNode?.querySelector('netmask')?.textContent?.trim() || '255.255.255.0';
  const defaultGateway = systemNode?.querySelector('default-gateway')?.textContent?.trim() || '192.168.1.254';

  // Check version from system or software tag
  let panOsVersion = systemNode?.querySelector('pan-os-version')?.textContent?.trim() ||
                     doc.querySelector('sw-version')?.textContent?.trim() ||
                     doc.querySelector('version')?.textContent?.trim() || '';

  // If version not explicitly in XML tags, try matching common version patterns in comments or file headers
  if (!panOsVersion) {
    const versionMatch = xmlString.match(/version="(\d+\.\d+\.\d+[^"]*)"/) || xmlString.match(/PAN-OS[ -](\d+\.\d+\.\d+[^ \r\n<]*)/i);
    panOsVersion = versionMatch ? versionMatch[1] : '10.2.8'; // Default fallback realistic PAN-OS
  }

  // Detect model
  const modelMatch = xmlString.match(/<model>([^<]+)<\/model>/) || xmlString.match(/PA-[0-9]{3,4}[A-Za-z-]*/);
  const model = modelMatch ? (modelMatch[1] || modelMatch[0]) : (doc.querySelector('devices > entry > device-group > entry, devices > entry > template > entry') ? 'Panorama M-Series' : 'PA-3260');

  // Detect serial
  const serialMatch = xmlString.match(/<serial>([^<]+)<\/serial>/) || xmlString.match(/01[0-9]{10}/);
  const serial = serialMatch ? (serialMatch[1] || serialMatch[0]) : '015301048291';

  // Management mode (standalone / Panorama-managed / Panorama / SCM)
  const management = detectManagement(doc, xmlString, model);
  const isPanorama = management.mode === 'panorama';

  // Vsys list
  const vsysEntries = Array.from(doc.querySelectorAll('devices > entry > vsys > entry'));
  const vsysList = vsysEntries.length > 0
    ? vsysEntries.map((e) => e.getAttribute('name') || 'vsys1')
    : ['vsys1'];

  // Device Groups (Panorama)
  const dgEntries = Array.from(doc.querySelectorAll('device-group > entry'));
  const deviceGroups = dgEntries.map((e) => e.getAttribute('name') || '').filter(Boolean);

  // 2. DNS & NTP
  const dnsPrimary = systemNode?.querySelector('dns-setting > servers > primary')?.textContent?.trim();
  const dnsSecondary = systemNode?.querySelector('dns-setting > servers > secondary')?.textContent?.trim();
  const dnsServers = [dnsPrimary, dnsSecondary].filter((s): s is string => Boolean(s));

  const ntpPrimary = systemNode?.querySelector('ntp-servers > primary-ntp-server > ntp-server-address')?.textContent?.trim() ||
                     systemNode?.querySelector('ntp > servers > primary')?.textContent?.trim();
  const ntpSecondary = systemNode?.querySelector('ntp-servers > secondary-ntp-server > ntp-server-address')?.textContent?.trim();
  const ntpAuth = Boolean(systemNode?.querySelector('ntp-servers > primary-ntp-server > authentication-type'));

  // 3. Permitted IP List for Management Interface
  const permittedIpNodes = systemNode?.querySelectorAll('permitted-ip > entry');
  const permittedIpList: string[] = [];
  if (permittedIpNodes && permittedIpNodes.length > 0) {
    permittedIpNodes.forEach((node) => {
      const name = node.getAttribute('name');
      if (name) permittedIpList.push(name);
    });
  }

  // 4. Services (HTTP, Telnet, SSH, SNMP)
  const serviceNode = systemNode?.querySelector('service');
  const disableHttp = serviceNode?.querySelector('disable-http')?.textContent?.trim() === 'yes';
  const disableTelnet = serviceNode?.querySelector('disable-telnet')?.textContent?.trim() === 'yes';
  const disableSsh = serviceNode?.querySelector('disable-ssh')?.textContent?.trim() === 'yes';
  const disableSnmp = serviceNode?.querySelector('disable-snmp')?.textContent?.trim() === 'yes';

  // In PAN-OS, if disable-http is not 'yes', HTTP is enabled
  const httpEnabled = !disableHttp;
  const telnetEnabled = !disableTelnet && (xmlString.includes('telnet') || !serviceNode);
  const sshEnabled = !disableSsh;
  const snmpEnabled = !disableSnmp;

  // 5. SSL/TLS Service Profile
  const sslProfileNode = doc.querySelector('ssl-tls-service-profile > entry');
  const sslMinVersion = (sslProfileNode?.querySelector('min-version')?.textContent?.trim() || 'tls1-0') as 'tls1-0' | 'tls1-1' | 'tls1-2' | 'tls1-3';

  // 6. Admin Accounts & Password Profile
  const adminEntries = Array.from(doc.querySelectorAll('mgt-config > users > entry, system > users > entry'));
  const adminAccounts = adminEntries.map((entry) => {
    const name = entry.getAttribute('name') || 'admin';
    const roleNode = entry.querySelector('role');
    const role = roleNode ? (roleNode.firstElementChild?.tagName || 'superuser') : 'superuser';
    const authProfile = entry.querySelector('authentication-profile')?.textContent?.trim();
    const hasMfa = Boolean(authProfile && (authProfile.toLowerCase().includes('mfa') || authProfile.toLowerCase().includes('okta') || authProfile.toLowerCase().includes('duo')));
    return { name, role, authenticationProfile: authProfile, hasMfa };
  });

  if (adminAccounts.length === 0) {
    adminAccounts.push({ name: 'admin', role: 'superuser', hasMfa: false, authenticationProfile: undefined });
  }

  const pwProfileNode = doc.querySelector('mgt-config > password-complexity');
  const pwEnabled = pwProfileNode?.querySelector('enabled')?.textContent?.trim() === 'yes';
  const pwMinLength = parseInt(pwProfileNode?.querySelector('minimum-length')?.textContent?.trim() || '8', 10);

  // 7. Session Timeout & Failed Attempts
  const idleTimeout = parseInt(systemNode?.querySelector('idle-timeout')?.textContent?.trim() || '60', 10);
  const failedLockout = parseInt(systemNode?.querySelector('failed-attempts')?.textContent?.trim() || '0', 10);

  // 8. GlobalProtect & SAML
  const gpActive = Boolean(doc.querySelector('global-protect') || doc.querySelector('client-config') || xmlString.includes('globalprotect-portal') || xmlString.includes('globalprotect-gateway'));
  const samlNode = doc.querySelector('saml-idp');
  const samlConfigured = Boolean(samlNode || xmlString.includes('saml'));
  const samlCertValidated = samlNode?.querySelector('validate-idp-certificate')?.textContent?.trim() !== 'no';

  // 9. Syslog & Panorama Forwarding
  const panoramaServer = systemNode?.querySelector('panorama-server')?.textContent?.trim() ||
                         doc.querySelector('panorama > server')?.textContent?.trim();
  const syslogNodes = Array.from(doc.querySelectorAll('shared > log-settings > syslog > entry, log-settings > syslog > entry'));
  const syslogServers = syslogNodes.map((n) => n.querySelector('server')?.textContent?.trim() || n.getAttribute('name') || '').filter(Boolean);

  // 10. Security Rules Parser
  const ruleEntries = Array.from(doc.querySelectorAll('rulebase > security > rules > entry, security > rules > entry'));
  const securityRules: SecurityRule[] = ruleEntries.map((ruleNode, idx) => {
    const name = ruleNode.getAttribute('name') || `rule-${idx + 1}`;
    const ruleLoc = locateNode(ruleNode);
    const fromZones = getMemberValues(ruleNode.querySelector('from'));
    const toZones = getMemberValues(ruleNode.querySelector('to'));
    const sources = getMemberValues(ruleNode.querySelector('source'));
    const destinations = getMemberValues(ruleNode.querySelector('destination'));
    const applications = getMemberValues(ruleNode.querySelector('application'));
    const services = getMemberValues(ruleNode.querySelector('service'));
    const sourceUsers = getMemberValues(ruleNode.querySelector('source-user'));
    const hipProfiles = getMemberValues(ruleNode.querySelector('hip-profiles'));
    const action = (ruleNode.querySelector('action')?.textContent?.trim() || 'allow') as SecurityRule['action'];
    const logStart = ruleNode.querySelector('log-start')?.textContent?.trim() === 'yes';
    const logEnd = ruleNode.querySelector('log-end')?.textContent?.trim() === 'yes';
    const disabled = ruleNode.querySelector('disabled')?.textContent?.trim() === 'yes';
    const description = ruleNode.querySelector('description')?.textContent?.trim();

    // Profile Settings
    const profileNode = ruleNode.querySelector('profile-setting');
    let profileSetting: SecurityRule['profileSetting'];
    if (profileNode) {
      const group = getMemberValues(profileNode.querySelector('group'));
      const virus = getMemberValues(profileNode.querySelector('virus'));
      const spyware = getMemberValues(profileNode.querySelector('spyware'));
      const vulnerability = getMemberValues(profileNode.querySelector('vulnerability'));
      const urlFiltering = getMemberValues(profileNode.querySelector('url-filtering'));
      const fileBlocking = getMemberValues(profileNode.querySelector('file-blocking'));
      const wildfire = getMemberValues(profileNode.querySelector('wildfire-analysis'));

      if (group.length || virus.length || spyware.length || vulnerability.length || urlFiltering.length || fileBlocking.length || wildfire.length) {
        profileSetting = {
          group: group.length ? group : undefined,
          virus: virus.length ? virus : undefined,
          spyware: spyware.length ? spyware : undefined,
          vulnerability: vulnerability.length ? vulnerability : undefined,
          urlFiltering: urlFiltering.length ? urlFiltering : undefined,
          fileBlocking: fileBlocking.length ? fileBlocking : undefined,
          wildfire: wildfire.length ? wildfire : undefined,
        };
      }
    }

    return {
      id: `rule-${idx + 1}`,
      name,
      fromZones: fromZones.length ? fromZones : ['any'],
      toZones: toZones.length ? toZones : ['any'],
      sources: sources.length ? sources : ['any'],
      destinations: destinations.length ? destinations : ['any'],
      applications: applications.length ? applications : ['any'],
      services: services.length ? services : ['any'],
      action,
      logStart,
      logEnd,
      sourceUsers: sourceUsers.length ? sourceUsers : ['any'],
      hipProfiles: hipProfiles.length ? hipProfiles : undefined,
      disabled,
      description,
      profileSetting,
      rulebase: ruleLoc.rulebase,
      location: { scope: ruleLoc.scope, name: ruleLoc.name },
      deviceGroup: ruleLoc.scope === 'device-group' ? ruleLoc.name : undefined,
      vsys: ruleLoc.scope === 'vsys' ? ruleLoc.name : undefined,
    };
  });

  // 11. Address Objects & Groups
  const addressEntries = Array.from(doc.querySelectorAll('address > entry'));
  const addressObjects: AddressObject[] = addressEntries.map((node) => {
    const name = node.getAttribute('name') || '';
    let type: AddressObject['type'] = 'ip-netmask';
    let value = '';

    if (node.querySelector('ip-netmask')) {
      type = 'ip-netmask';
      value = node.querySelector('ip-netmask')?.textContent?.trim() || '';
    } else if (node.querySelector('ip-range')) {
      type = 'ip-range';
      value = node.querySelector('ip-range')?.textContent?.trim() || '';
    } else if (node.querySelector('fqdn')) {
      type = 'fqdn';
      value = node.querySelector('fqdn')?.textContent?.trim() || '';
    } else if (node.querySelector('ip-wildcard')) {
      type = 'wildcard';
      value = node.querySelector('ip-wildcard')?.textContent?.trim() || '';
    }

    const { scope, name: scopeName } = locateNode(node);
    return {
      name,
      type,
      value: value || name,
      description: node.querySelector('description')?.textContent?.trim(),
      location: { scope, name: scopeName },
    };
  }).filter((obj) => Boolean(obj.name));

  const groupEntries = Array.from(doc.querySelectorAll('address-group > entry'));
  const addressGroups: AddressGroupObject[] = groupEntries.map((node) => {
    const name = node.getAttribute('name') || '';
    const staticMembers = getMemberValues(node.querySelector('static'));
    const isDynamic = Boolean(node.querySelector('dynamic'));

    return {
      name,
      type: (isDynamic ? 'dynamic' : 'static') as 'dynamic' | 'static',
      members: staticMembers,
      description: node.querySelector('description')?.textContent?.trim(),
      location: (({ scope, name: n }) => ({ scope, name: n }))(locateNode(node)),
    };
  }).filter((grp) => Boolean(grp.name));

  // 12. Service Objects
  const serviceEntries = Array.from(doc.querySelectorAll('service > entry'));
  const serviceObjects: ServiceObject[] = serviceEntries.map((node) => {
    const name = node.getAttribute('name') || '';
    const tcpPort = node.querySelector('protocol > tcp > port')?.textContent?.trim();
    const udpPort = node.querySelector('protocol > udp > port')?.textContent?.trim();

    return {
      name,
      protocol: (udpPort ? 'udp' : 'tcp') as 'tcp' | 'udp',
      port: tcpPort || udpPort || 'any',
      description: node.querySelector('description')?.textContent?.trim(),
      location: (({ scope, name: n }) => ({ scope, name: n }))(locateNode(node)),
    };
  }).filter((srv) => Boolean(srv.name));

  // 13. Decryption Rules
  const decryptEntries = Array.from(doc.querySelectorAll('rulebase > decryption > rules > entry, decryption > rules > entry'));
  const decryptionRules: DecryptionRule[] = decryptEntries.map((node) => {
    const name = node.getAttribute('name') || '';
    const action = (node.querySelector('action')?.textContent?.trim() || 'decrypt') as 'no-decrypt' | 'decrypt';
    const type = (node.querySelector('type > ssl-forward-proxy') ? 'ssl-forward-proxy' :
                  node.querySelector('type > ssl-inbound-inspection') ? 'ssl-inbound-inspection' : 'ssh-proxy') as DecryptionRule['type'];
    const disabled = node.querySelector('disabled')?.textContent?.trim() === 'yes';

    return {
      name,
      fromZones: getMemberValues(node.querySelector('from')),
      toZones: getMemberValues(node.querySelector('to')),
      sources: getMemberValues(node.querySelector('source')),
      destinations: getMemberValues(node.querySelector('destination')),
      action,
      type,
      disabled,
    };
  });

  const hardening: DeviceHardeningSettings = {
    hostname,
    domain,
    ipAddress,
    netmask,
    defaultGateway,
    dnsServers,
    ntpServers: {
      primary: ntpPrimary,
      secondary: ntpSecondary,
      authEnabled: ntpAuth,
    },
    permittedIpList,
    services: {
      http: httpEnabled,
      https: true,
      telnet: telnetEnabled,
      ssh: sshEnabled,
      snmp: snmpEnabled,
      ping: true,
    },
    sslTlsServiceProfile: {
      name: sslProfileNode?.getAttribute('name') || 'default-ssl-service',
      minVersion: sslMinVersion,
    },
    sshCryptoProfile: {
      ciphersHardened: !xmlString.includes('aes128-cbc') && !xmlString.includes('3des-cbc'),
      macsHardened: !xmlString.includes('hmac-sha1'),
      details: xmlString.includes('aes128-cbc') ? 'Legacy CBC ciphers detected' : 'Modern SSH ciphers configured',
    },
    adminAccounts,
    passwordComplexity: {
      enabled: pwEnabled,
      minLength: pwMinLength,
    },
    sessionIdleTimeoutMinutes: idleTimeout,
    failedAttemptsLockout: failedLockout,
    panoramaForwardingConfigured: Boolean(panoramaServer),
    syslogServers,
    loginBannerConfigured: Boolean(systemNode?.querySelector('login-banner')),
    globalProtectConfigured: gpActive,
    samlConfigured,
    samlCertValidated,
  };

  return {
    sourceFileName,
    parsedAt: new Date().toISOString(),
    metadata: {
      hostname,
      model,
      serial,
      panOsVersion,
      isPanorama,
      vsysList,
      deviceGroups: deviceGroups.length ? deviceGroups : undefined,
      management,
    },
    securityRules,
    natRules: [],
    addressObjects,
    addressGroups,
    serviceObjects,
    decryptionRules,
    hardening,
    rawXmlPreview: xmlString.slice(0, 10000),
    referencedNames: Array.from(new Set(
      Array.from(doc.querySelectorAll('member, translated-address'))
        .filter((n) => n.children.length === 0)
        .map((n) => n.textContent?.trim() || '')
        .filter(Boolean)
    )),
  };
}
