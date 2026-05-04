import PublicPageFrame from "../../components/PublicPageFrame";
import "./PrivacyPage.css";
import privacyHeroImage from "../../assets/public/lecture-discussion.jpg";

export default function PrivacyPage() {
  const privacySections = [
    {
      eyebrow: "Data use",
      title: "Used only for active reports",
      text: "Account details, item descriptions, dates, locations, and messages support reporting, review, and return.",
    },
    {
      eyebrow: "Access",
      title: "Found-item records stay limited",
      text: "Detailed found-item records stay with administrators to reduce false claims and protect verification.",
    },
    {
      eyebrow: "Messages",
      title: "Communication stays case-based",
      text: "Messages are used only for updates, verification, and support related to an active report.",
    },
    {
      eyebrow: "Verification",
      title: "Returns stay controlled",
      text: "Ownership checks happen before any item is released back to a student.",
    },
  ];

  return (
    <PublicPageFrame active="privacy">
      <section className="section-shell privacy-hero">
        <div className="privacy-hero__copy">
          <div className="home-highlight-label">Privacy &amp; protection</div>
          <h1 className="privacy-hero__title">Privacy comes first.</h1>
          <p className="privacy-hero__lead">
            The portal is designed to protect student information, limit access
            to found-item records, and keep recovery steps controlled.
          </p>
        </div>

        <div className="privacy-hero__visual">
          <img
            src={privacyHeroImage}
            alt="Students taking part in a classroom discussion"
          />
        </div>
      </section>

      <section className="section-shell privacy-overview">
        <div className="privacy-overview__intro">
          <div className="home-highlight-label">Privacy overview</div>
          <h2>What stays controlled.</h2>
          <p>
            The recovery flow only uses the information it needs, and detailed
            found-item access stays on the administrator side.
          </p>
        </div>

        <div className="privacy-grid">
          {privacySections.map((section) => (
            <article key={section.title} className="privacy-card">
              <span className="privacy-card__eyebrow">{section.eyebrow}</span>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell privacy-note">
        <div className="privacy-note__content">
          <div className="home-highlight-label">Support</div>
          <h2>Need a clearer answer?</h2>
          <p>
            If you have a question about access, verification, or what details
            are shared, the support team can explain the process.
          </p>

          <a
            href="mailto:lostandfound@hunter.cuny.edu"
            className="home-header__button privacy-note__cta"
          >
            <span className="home-header__button-face">Contact Support</span>
          </a>
        </div>
      </section>
    </PublicPageFrame>
  );
}
