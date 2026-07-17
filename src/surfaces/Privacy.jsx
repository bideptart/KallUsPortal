import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import Logo from '../components/Logo.jsx';

const LAST_UPDATED = '17 June 2026';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" aria-label="Home"><Logo size={44} showWordmark={false} /></Link>
        <Link to="/" className="text-sm font-medium text-sky-600 hover:underline">Home</Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-slate prose-sm">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-mute">Last updated: {LAST_UPDATED}</p>
        <p className="text-sm text-mute">
          <strong>Company:</strong> Ace Peak Invest Pte Ltd · <strong>Support:</strong>{' '}
          <a href="mailto:support@9278.ai">support@9278.ai</a>
        </p>

        <h2>1. Introduction and Scope</h2>
        <p>
          9278.ai provides software enabling businesses to build, launch, and scale AI voice agents handling
          inbound and outbound phone calls. The platform connects to existing carrier accounts, runs an
          audio-native conversational engine, and answers questions from your knowledge base.
        </p>
        <p>
          The commitment is protecting privacy and ensuring personal information security. This Privacy Policy
          applies to all users worldwide and governs website visits and service use. By accessing or using
          Services, you agree to these terms. If you disagree, do not use the Services or website.
        </p>
        <p>For additional questions, contact <a href="mailto:support@9278.ai">support@9278.ai</a>.</p>

        <h2>2. Information We Collect</h2>
        <p>
          We collect several information types for various purposes to provide and improve Services. Information
          is obtained when visiting the website, contacting us, creating accounts, building or operating AI voice
          agents, placing or receiving calls, or downloading account data.
        </p>

        <h3>2.1 Personal Information You Provide to Us</h3>
        <p>Personal information collected voluntarily includes:</p>
        <ul>
          <li>Registering for accounts on website, dashboard, or app</li>
          <li>Expressing interest in information about us or Services</li>
          <li>Purchasing voice credit, top-ups, or other services</li>
          <li>Building, configuring, or operating AI voice agents</li>
          <li>Submitting content for agent use (prompts, knowledge bases, FAQs, documentation)</li>
          <li>Participating in activities (demos, contests, newsletters)</li>
          <li>Contacting us for support, sales, or inquiries</li>
        </ul>
        <p>Personal information collected may include:</p>
        <ul>
          <li><strong>Contact and Account Information:</strong> Name, email, phone number, mobile number, billing details, company name, account credentials.</li>
          <li><strong>Payment Information:</strong> Credit/debit card or payment details for voice-credit purchases, handled securely by third-party payment processing partners. Full payment card numbers are not stored on our servers.</li>
          <li><strong>Know Your Customer (KYC) and Verification Information:</strong> Identity verification may be required due to service or regulatory requirements (telecommunications, anti-fraud compliance). This may involve government-issued identification, business registration, or proof of address. Third-party service providers may handle verification processes under their privacy policies.</li>
          <li><strong>Agent Configuration and Content:</strong> System prompts, personas, guardrails, conversation flows, documents, FAQs, or knowledge-base content connected to agents. This content may contain personal information you include.</li>
          <li><strong>Communications:</strong> Information provided when contacting sales, support, or other teams, including correspondence records and copies.</li>
          <li><strong>Feedback and Testimonials:</strong> Feedback, reviews, or testimonials may be collected and used for marketing purposes, including name, photo (if provided), and position, with consent where required.</li>
        </ul>

        <h3>2.2 Information Collected Automatically</h3>
        <p>
          When visiting, using, or navigating Services, certain information may be automatically collected that
          does not typically reveal specific identity but may include:
        </p>
        <ul>
          <li><strong>Device Information:</strong> IP address, device type, browser type and characteristics, operating system, language preferences, device settings, unique device identifiers, device name.</li>
          <li><strong>Usage Information:</strong> Details of interactions with Services, such as access times, pages viewed, links clicked, features used, referring URLs, country, approximate location. This primarily maintains security and operation of Services and supports internal analytics and reporting.</li>
          <li><strong>Call Detail Records (CDRs):</strong> For calls placed or received through Services, we and/or carriers collect records that may include calling number, dialed number, time of day, call duration, routing and quality metadata.</li>
          <li><strong>Call Audio and Transcripts:</strong> Because the platform runs an audio-native voice engine, calls handled by AI voice agents may be processed as audio and/or transcribed in real time. Where call recording, transcription, or conversation logging is enabled, resulting audio, transcripts, and derived data (sentiment and intent signals) are stored and made available to authorized users and 9278.ai support through secured platform portions. For call-quality diagnostics, call audio may be temporarily processed or recorded for troubleshooting, then deleted afterward.</li>
          <li><strong>Conversation Analytics:</strong> Derived signals including detected language, sentiment, intent, and outcome helping operate, measure, and improve agents.</li>
          <li><strong>Cookies and Similar Tracking Technologies:</strong> Cookies, web beacons, and pixels collect and store information tailoring website experiences. Browsers can be configured to remove or reject cookies, though this may affect certain features. See Section 9 for details.</li>
        </ul>

        <h3>2.3 Information from Third-Party Sources</h3>
        <p>Personal information may be collected from third parties and other sources, such as:</p>
        <ul>
          <li><strong>Carrier and Telephony Partners:</strong> Information necessary to route, connect, and bill calls through connected carrier accounts.</li>
          <li><strong>Affiliate Partners and Integrated Services:</strong> Information from partners, resellers, or services (CRMs, calendars, knowledge sources) integrated with the platform.</li>
          <li><strong>Advertisers and Analytics Providers:</strong> Data from advertising and analytics networks supporting and measuring marketing efforts.</li>
          <li><strong>Publicly Available Sources:</strong> Information from public sources, such as professional profiles, believed relevant to service use.</li>
        </ul>
        <p>Information from third parties is combined with service-collected data and treated as personal information per this Privacy Policy.</p>

        <h3>2.4 Information Collected on Behalf of Our Customers (Caller Data)</h3>
        <p>
          Individuals calling or called by AI voice agents that customers operate using Services have their
          information collected by customers, who are responsible for that information. Customers act as
          information controllers and must provide appropriate notice to and obtain required consent from
          individuals their agents interact with — including call recording notice.
        </p>
        <p>
          In these cases, 9278.ai generally acts as a processor or service provider, processing call audio,
          transcripts, and related data on customer behalf under their instructions. Caller data is not used for
          independent purposes except as necessary for providing, securing, and maintaining Services, or as
          legally required.
        </p>

        <h3>2.5 Free Tools and Live Demos</h3>
        <p>
          Information provided when using live demos or free tools may be processed during active sessions
          demonstrating Services. Demo call audio and related data are used operating the demo and may be retained
          only as needed for security, abuse prevention, and improving Services, after which it is deleted or
          anonymized.
        </p>

        <h2>3. How We Use Your Personal Information</h2>
        <p>
          Personal information is used for purposes based on legitimate business interests, contract performance,
          legal compliance, and/or consent.
        </p>
        <h3>3.1 To Provide and Manage Our Services</h3>
        <ul>
          <li>Setting up and managing accounts and self-hosted control panels</li>
          <li>Building, configuring, running, and scaling AI voice agents</li>
          <li>Processing voice-credit top-ups and delivering requested services, including routing inbound and outbound calls through connected carriers</li>
          <li>Enabling agents to answer from connected knowledge bases and integrations</li>
          <li>Providing customer support and responding to inquiries and requests</li>
          <li>Billing, credit management, and collection purposes</li>
        </ul>
        <h3>3.2 To Improve and Enhance Our Services</h3>
        <ul>
          <li>Understanding how users and callers interact with Services to enhance functionality, voice quality, latency, and user experience</li>
          <li>Analyzing preferences, usage trends, and conversation outcomes, and improving features</li>
          <li>Personalizing Services according to user preferences</li>
          <li>Internal analytics and reporting</li>
        </ul>
        <h3>3.3 To Communicate with You</h3>
        <ul>
          <li>Sending announcements, updates, service-related communications, and administrative messages</li>
          <li>Sending marketing and promotional materials if interest is shown or communication receipt is agreed. Opt-out is possible anytime.</li>
          <li>Requesting feedback on Services</li>
          <li>Contacting by phone, email, or message for support, sales, or other business purposes if details are provided for these reasons</li>
        </ul>
        <h3>3.4 For Security and Fraud Prevention</h3>
        <ul>
          <li>Maintaining Services security and operation</li>
          <li>Protecting accounts, agents, and Services from unauthorized access, abuse, and fraudulent activities, including telecommunications fraud</li>
          <li>Detecting and preventing Terms of Service violations</li>
        </ul>
        <h3>3.5 For Legal and Compliance Purposes</h3>
        <ul>
          <li>Complying with legal obligations, court orders, judicial proceedings, or other legal processes, including telecommunications regulations</li>
          <li>Responding to lawful requests from public authorities, including meeting national security or law enforcement requirements</li>
          <li>Exercising, establishing, or defending legal rights</li>
          <li>Protecting vital interests of yourself or another person</li>
        </ul>
        <p>Even after account cancellation or expiration, sales and marketing teams may contact you, which you can opt out of.</p>

        <h2>4. How We Share Your Information</h2>
        <p>
          We do not sell, trade, or distribute personal information to third parties for their own use without
          consent, except as described in this Privacy Policy or as permitted by law.
        </p>
        <h3>4.1 With Service Providers and Partners</h3>
        <p>
          Information is shared with third-party service providers performing services on our behalf, such as
          payment processors, cloud hosting and infrastructure providers, AI and speech-processing providers, data
          analysis providers, analytics services, and customer support tools. Access is limited to what is
          necessary, and they are obligated to maintain confidentiality.
        </p>
        <ul>
          <li><strong>Carrier and Telephony Providers:</strong> To connect, route, and bill calls, required information is exchanged with connected carrier and telephony providers. Phone numbers and call charges generally remain directly billed by existing carriers.</li>
          <li><strong>Payment Details:</strong> Payment processing partners securely store and process payment details, which are not shared externally for other purposes.</li>
        </ul>
        <h3>4.2 With Group Companies</h3>
        <p>Information may be shared with affiliated or group companies for operational purposes, where applicable, subject to this Privacy Policy.</p>
        <h3>4.3 For Business Transfers</h3>
        <p>Information may be shared or transferred in connection with any merger, sale of company assets, financing, or acquisition of all or a portion of the business. In bankruptcy proceedings, information may be transferred to the acquirer.</p>
        <h3>4.4 For Legal Requirements and Protection</h3>
        <p>Information may be disclosed if required by law, subpoena, search warrant, court order, or other valid legal process, or to:</p>
        <ul>
          <li>Comply with requests from government agencies, public authorities, or law enforcement</li>
          <li>Exercise, establish, or defend legal rights, or protect against fraud, misuse, and unlawful acts</li>
          <li>Protect vital interests, rights, property, or safety of 9278.ai, users, callers, or the general public</li>
        </ul>
        <h3>4.5 With Your Consent</h3>
        <p>Personal information may be disclosed for any other purpose with consent.</p>
        <h3>4.6 Aggregated or Anonymized Data</h3>
        <p>Aggregated or anonymized data that does not directly identify you may be created and shared with third parties for research, benchmarking, marketing, or other purposes.</p>
        <h3>4.7 At Your Direction</h3>
        <p>When integrations (CRM, calendar, knowledge source) are connected to agents, information flows to and from those services at your direction and is subject to their privacy policies.</p>

        <h2>5. Data Security and Retention</h2>
        <h3>5.1 Data Security</h3>
        <p>
          Appropriate technical and organizational security measures are implemented, including encryption in
          transit (SSL/TLS) and access controls. Because the 9278.ai control panel is self-hosted, you play an
          important role securing the environment, credentials, and integrations under your control. No Internet
          transmission method or electronic storage is 100% secure.
        </p>
        <h3>5.2 Data Retention</h3>
        <p>Personal information is retained only as long as necessary fulfilling collection purposes, including providing Services, complying with legal obligations, resolving disputes, and enforcing agreements.</p>
        <ul>
          <li><strong>Account Data:</strong> Retained as long as legitimate business reasons exist.</li>
          <li><strong>Voice Credit and Account Expiration/Cancellation:</strong> Voice credit is valid for limited periods from purchase. If accounts or subscriptions expire or are cancelled, associated data — including remaining credit, agents, logs, recordings, and transcripts — may be deleted on or after expiry, generally with no recovery option once deleted.</li>
          <li><strong>Fraudulent Activities:</strong> Accounts involved in fraudulent or abusive activities may face permanent suspension, and we are not liable for resulting data loss.</li>
          <li><strong>Call Recordings and Transcripts:</strong> Retained for configured periods (where opted in). Diagnostic recordings are deleted after troubleshooting.</li>
          <li><strong>Call Detail Records (CDRs):</strong> Retained for account duration or as legally required or for legitimate business purposes.</li>
          <li><strong>Demo and Free Tools Data:</strong> Retained only as needed for security and improvement, then deleted or anonymized.</li>
        </ul>

        <h2>6. Your Rights and Choices</h2>
        <p>Depending on location and applicable law (EU/UK GDPR, CCPA/CPRA, and other data protection laws), the following rights may apply:</p>
        <ul>
          <li><strong>Access and Correction:</strong> Access your information and request correction of inaccurate or incomplete information.</li>
          <li><strong>Deletion (Right to be Forgotten):</strong> Request deletion, subject to legal or business retention requirements.</li>
          <li><strong>Restrict or Object to Processing:</strong> Limit or object to processing in certain circumstances.</li>
          <li><strong>Data Portability:</strong> Request transfer in a structured, commonly used, machine-readable format.</li>
          <li><strong>Withdraw Consent:</strong> Where processing is based on consent, withdraw it anytime (does not affect prior processing).</li>
          <li><strong>Opt-Out of Marketing:</strong> Opt out of promotional communications. Essential service or administrative messages cannot be unsubscribed from.</li>
          <li><strong>CCPA/CPRA (California):</strong> Know, delete, correct, and opt out of "sale" or "sharing." We do not sell personal information.</li>
          <li><strong>GDPR (EU/UK):</strong> Access, rectification, erasure, restriction, portability, and objection. Data Processing Addendums (DPA) are available for customers processing EU/UK individuals' data.</li>
        </ul>
        <p>To exercise these rights, contact us using the Section 13 details. Requests typically receive responses within one month, or as otherwise legally required.</p>

        <h2>7. International Data Transfers</h2>
        <p>
          As a global service, information may be transferred to, stored, and processed in countries other than
          your own. These countries may have different data protection laws. By using Services and submitting
          information, you acknowledge such transfers. Where required, appropriate safeguards — such as standard
          contractual clauses or adequacy decision reliance — are put in place per applicable law.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          Services are not intended for individuals under 18 (or majority age in their jurisdiction). Personal
          information from children under this age is not knowingly collected. If you believe a child provided
          personal information without appropriate consent, contact us immediately and we will promptly remove it.
        </p>

        <h2>9. Cookies and Tracking Technologies; Do-Not-Track</h2>
        <h3>9.1 Cookies and Similar Technologies</h3>
        <p>
          Cookies, web beacons, and pixels track activity and store information enhancing user experience and
          tailoring Services. Cookies are small data files that may include anonymous unique identifiers. Browsers
          can be configured to reject cookies, but this may affect certain features.
        </p>
        <h3>9.2 Do-Not-Track (DNT)</h3>
        <p>We do not currently respond to DNT browser signals, as no uniform standard exists. If a standard is adopted, this Privacy Policy will be updated accordingly.</p>

        <h2>10. Third-Party Links and Services</h2>
        <p>
          Services may contain links to, or integrations with, third-party websites or services not owned or
          controlled by 9278.ai. These third parties have their own privacy policies, and we are not responsible
          for their practices or content. Interactions through integrated third-party platforms (carriers, CRMs,
          calendars, support tools) are subject to their privacy policies.
        </p>

        <h2>11. Changes to This Privacy Policy</h2>
        <p>
          This Privacy Policy may be updated reflecting practice changes or legal, operational, or regulatory
          reasons. Updates are effective immediately upon posting on Services (www.9278.ai). Significant changes
          are notified via Service, website, or email (if available). Continued use after changes implies
          acceptance, except for new processing requiring consent.
        </p>

        <h2>12. Communication Channels</h2>
        <p>Official communication channels include:</p>
        <ul>
          <li><strong>Email:</strong> Official 9278.ai domains (<a href="mailto:support@9278.ai">support@9278.ai</a> and <a href="mailto:sales@9278.ai">sales@9278.ai</a>)</li>
          <li><strong>Website:</strong> www.9278.ai</li>
          <li><strong>Customer Dashboard:</strong> voice.9278.ai</li>
        </ul>
        <p>Be cautious of unofficial source communications, and contact support via our website if authenticity is uncertain.</p>

        <h2>13. Contact Us</h2>
        <p>For questions, concerns, or exercising rights, contact us at:</p>
        <ul>
          <li><strong>Company Name:</strong> Ace Peak Invest Pte Ltd</li>
          <li><strong>Address:</strong> 1 Scotts Road #24-10 Shaw Centre, Singapore 228208, Singapore</li>
          <li><strong>Support Email:</strong> <a href="mailto:support@9278.ai">support@9278.ai</a></li>
          <li><strong>Sales &amp; Partnerships:</strong> <a href="mailto:sales@9278.ai">sales@9278.ai</a></li>
          <li><strong>Voice:</strong> +1 347-474-4009</li>
        </ul>

        <h2>14. Consent</h2>
        <p>
          By using our website (www.9278.ai) and Services, you consent to this Privacy Policy and agree to its
          terms. If you disagree, please contact us or discontinue 9278.ai platform use.
        </p>
      </main>

      <Footer />
    </div>
  );
}
