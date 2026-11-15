# PAN-OS TSF Auditor & NIST 800-53 / Zero Trust Compliance Analyzer

A 100% client-side compliance auditing and configuration analysis tool for **Palo Alto Networks NGFW firewalls and Panorama**. Upload a Technical Support File (TSF) or exported XML configuration to extract the merged managed configuration, evaluate NIST SP 800-53 Rev 5 and Zero Trust Architecture controls, identify orphaned objects and shadowed rules, verify device hardening, cross-check PAN-OS security advisories and community bug reports, and generate a strictly formatted **3-page executive report**.

---

## Key Capabilities

- **Technical Support File (TSF) Extraction**
  - Decompresses `.tgz`, `.tar.gz`, `.gz`, and `.zip` archives directly in the browser using `pako` and `jszip`, or parses raw `merged-config.xml` / `running-config.xml` files.
  - Includes three built-in enterprise sample profiles (**PA-3260**, **Panorama M-600**, and **PA-5450**) for immediate evaluation without uploading a file.
- **3-Page Executive & Technical Report (Print / PDF Ready)**
  - **Page 1 — Executive Summary & Security Advisories:** Overall posture score, risk tier, top executive risks with remediation steps, active CVE advisories, and TAC Golden Release target.
  - **Page 2 — NIST SP 800-53 Rev 5 & Zero Trust (NIST SP 800-207):** Control-by-control compliance matrix (`AC-3`, `AC-4`, `SC-7`, `SC-7(5)`, `AU-2`, `AU-6`, `IA-2`, `SC-8`, `CM-6`, `SI-3/4`) and a 5-pillar Zero Trust maturity breakdown with a phased roadmap.
  - **Page 3 — Hygiene Cleanup, Hardening & Community Guidance:** Unused objects, shadowed rules, copyable PAN-OS CLI cleanup snippet, device hardening checklist, TAC release notes, `r/paloaltonetworks` community bug tracker warnings, and sign-off block.
- **Object Hygiene & CLI Remediation**
  - Detects unreferenced address objects, address groups, custom service objects, shadowed/redundant rules, and overly permissive rules (`any-any` or unlogged rules).
  - Generates a ready-to-run PAN-OS `configure` CLI script to prune unused objects and rules.
- **PSIRT Advisories, TAC Guidance & Community Bug Correlation**
  - Matches detected PAN-OS version and active features (GlobalProtect, management exposure, SAML) against critical advisories (including `CVE-2024-3400`, `CVE-2024-0012`, `CVE-2024-9474`, `CVE-2024-5915`, `CVE-2020-2021`, `CVE-2022-0028`).
  - Surfaces TAC Golden Release upgrade paths and known hardware/software field bugs reported on `r/paloaltonetworks`.

---

## Privacy & Air-Gapped Processing

All archive decompression, XML parsing, rulebase inspection, and compliance scoring execute **entirely in browser memory**. No firewall configurations, IP schemas, policies, or administrative usernames are transmitted to any external server.

---

## Local Development

### Prerequisites
- Node.js 20+ and npm

### Commands
```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev

# Type-check with TypeScript
npm run lint

# Build production static bundle (outputs to dist/)
npm run build
```

---

## Free Hosting on GitHub (and Alternatives)

Because this application is completely static with no backend server required, you can host it for **$0**.

> **Note for Free GitHub Accounts:** GitHub Free only enables **GitHub Pages** for **Public** repositories. If your repository is **Private**, GitHub hides/locks the Pages setting behind a Pro upgrade prompt. Making this repository Public is safe as long as you do not commit any personal TSF/XML files—only the analyzer source code lives in the repo.

### Option A: GitHub Pages (Free with a **Public** Repository)
1. Ensure your GitHub repository is set to **Public** (under **Settings** &rarr; **Danger Zone** &rarr; **Change repository visibility**).
2. Push this codebase to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: PAN-OS TSF Auditor"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```
3. In GitHub, open **Settings** &rarr; **Pages**.
4. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions** (the included `.github/workflows/deploy.yml` workflow will build and publish `dist/` automatically).
   - *Branch alternative:* Run `npm run build`, copy `dist/` to `docs/` on `main`, push, and choose **Deploy from a branch** (`main` / `/docs`).
5. Once the workflow completes in the **Actions** tab, your app will be live at:
   `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`

### Option B: Keep Your GitHub Repo **Private** for Free (Cloudflare Pages / Netlify)
If you want to keep your GitHub repository **Private** on a Free GitHub account:
1. Push your code to your **Private** GitHub repository.
2. Create a free account on **[Cloudflare Pages](https://pages.cloudflare.com/)** or **[Netlify](https://www.netlify.com/)**.
3. Connect your GitHub account and select your private repository.
4. Configure the build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Deploy to get a free HTTPS URL (`*.pages.dev` or `*.netlify.app`) with automatic builds on every push.

---

## Project Structure

```text
├── .github/workflows/deploy.yml   # GitHub Pages automated build & deploy workflow
├── index.html                     # Entry HTML with typography & metadata
├── src/
│   ├── App.tsx                    # Main workspace, tab switching, upload modal
│   ├── index.css                  # Tailwind CSS v4 + strict 3-page @media print rules
│   ├── types/panos.ts             # TypeScript interfaces for PAN-OS, NIST, ZTA, CVEs
│   ├── data/
│   │   ├── advisoriesAndIssues.ts # PSIRT advisories, TAC guidance & Reddit bug database
│   │   └── sampleConfigs.ts       # Built-in PA-3260, Panorama M-600 & PA-5450 profiles
│   ├── services/
│   │   ├── tsfExtractor.ts        # In-browser .tgz/.tar.gz/.zip extractor & XML parser
│   │   ├── nistAuditor.ts         # NIST SP 800-53 Rev 5 rule evaluator
│   │   ├── zeroTrustAuditor.ts    # NIST SP 800-207 5-pillar ZTA maturity scorer
│   │   ├── cleanupAuditor.ts      # Unused objects, shadow rules & CLI script builder
│   │   └── advisoryMatcher.ts     # Version comparator, CVE matcher & report assembler
│   └── components/
│       ├── Header.tsx             # Top navigation, sample switcher & print trigger
│       ├── FileUploadZone.tsx     # Drag-and-drop TSF/XML uploader & sample cards
│       ├── ThreePageReport.tsx    # Strictly paginated 3-page Executive & Technical Report
│       ├── NistTab.tsx            # Interactive NIST 800-53 controls explorer
│       ├── ZeroTrustTab.tsx       # Zero Trust maturity breakdown & phase roadmap
│       ├── CleanupTab.tsx         # Unused objects, shadow rules & CLI script exporter
│       ├── AdvisoriesTab.tsx      # PSIRT CVE advisories, TAC path & Reddit sentiments
│       └── RulesExplorerTab.tsx   # Searchable security rulebase inspector
└── vite.config.ts                 # Vite configuration with relative base ('./')
```
