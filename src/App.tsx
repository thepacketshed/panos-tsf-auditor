import React, { useState, useTransition } from 'react';
import { PanOsConfig, AuditReportData } from './types/panos';
import { SAMPLE_CONFIG_PA3260, SAMPLE_CONFIG_PANORAMA, SAMPLE_CONFIG_PA5450 } from './data/sampleConfigs';
import { extractConfigXmlFromFile, parsePanOsXml } from './services/tsfExtractor';
import { generateAuditReport } from './services/advisoryMatcher';
import { Header } from './components/Header';
import { FileUploadZone } from './components/FileUploadZone';
import { ThreePageReport } from './components/ThreePageReport';
import { NistTab } from './components/NistTab';
import { ZeroTrustTab } from './components/ZeroTrustTab';
import { CleanupTab } from './components/CleanupTab';
import { AdvisoriesTab } from './components/AdvisoriesTab';
import { RulesExplorerTab } from './components/RulesExplorerTab';
import { Upload, FileArchive } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<PanOsConfig>(SAMPLE_CONFIG_PA3260);
  const [reportData, setReportData] = useState<AuditReportData>(() => generateAuditReport(SAMPLE_CONFIG_PA3260));
  const [activeTab, setActiveTab] = useState<string>('report');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  const handleLoadSample = (sampleKey: 'pa3260' | 'panorama' | 'pa5450') => {
    let selectedConfig = SAMPLE_CONFIG_PA3260;
    if (sampleKey === 'panorama') selectedConfig = SAMPLE_CONFIG_PANORAMA;
    if (sampleKey === 'pa5450') selectedConfig = SAMPLE_CONFIG_PA5450;

    const report = generateAuditReport(selectedConfig);
    setConfig(selectedConfig);
    setReportData(report);
    setErrorMessage('');
    setShowUploadModal(false);
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage('');
    setStatusMessage(`Reading ${file.name}...`);

    try {
      setStatusMessage('Extracting archive contents and locating merged-config.xml...');
      const { xmlString, fileName } = await extractConfigXmlFromFile(file);

      setStatusMessage('Parsing PAN-OS XML rulebases, address objects, and system configurations...');
      const parsedConfig = parsePanOsXml(xmlString, fileName);

      setStatusMessage('Auditing NIST 800-53 controls, Zero Trust architecture & CVE advisories...');
      const report = generateAuditReport(parsedConfig);

      setConfig(parsedConfig);
      setReportData(report);
      setIsProcessing(false);
      setShowUploadModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    // Switch to report tab first if not already there, then print
    if (activeTab !== 'report') {
      setActiveTab('report');
      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      window.print();
    }
  };

  const handleReset = () => {
    setShowUploadModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        config={config}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onPrint={handlePrint}
        onReset={handleReset}
        onLoadSample={handleLoadSample}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-16">
        {/* On-screen active banner */}
        <div className="no-print border-b border-slate-900 bg-slate-900/40 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Auditing File: <strong className="text-slate-200 font-mono">{config.sourceFileName}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Security Rules: <strong className="text-slate-200 font-mono">{config.securityRules.length}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Address Objects: <strong className="text-slate-200 font-mono">{config.addressObjects.length}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 text-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Different TSF (.tgz / .zip / .xml)</span>
            </button>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'report' && (
          <ThreePageReport reportData={reportData} onPrint={handlePrint} />
        )}

        {activeTab === 'nist' && (
          <NistTab
            evaluations={reportData.nistEvaluations}
            compliancePercentage={reportData.nistCompliancePercentage}
          />
        )}

        {activeTab === 'zerotrust' && (
          <ZeroTrustTab
            pillars={reportData.zeroTrustPillars}
            overallScore={reportData.zeroTrustOverallScore}
          />
        )}

        {activeTab === 'cleanup' && (
          <CleanupTab
            cleanupSummary={reportData.cleanupSummary}
            hostname={config.metadata.hostname}
          />
        )}

        {activeTab === 'advisories' && (
          <AdvisoriesTab
            advisories={reportData.advisories}
            releaseGuidance={reportData.releaseGuidance}
            panOsVersion={config.metadata.panOsVersion}
            model={config.metadata.model}
          />
        )}

        {activeTab === 'rules' && (
          <RulesExplorerTab securityRules={config.securityRules} />
        )}
      </main>

      {/* Upload Modal (when user clicks Upload or Switch file) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative max-w-4xl w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl my-8">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
            <FileUploadZone
              onFileSelect={handleFileSelect}
              onLoadSample={handleLoadSample}
              isProcessing={isProcessing}
              statusMessage={statusMessage}
              errorMessage={errorMessage}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="no-print border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-400">
        <div>
          PAN-OS & Panorama Technical Support File Auditor · NIST SP 800-53 Rev 5 & Zero Trust (NIST SP 800-207)
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          Client-side parsing ensures strict confidentiality: no firewall rules or credentials leave your browser.
        </div>
      </footer>
    </div>
  );
}
