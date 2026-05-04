import { Link } from "react-router-dom";
import PublicPageFrame from "../../components/PublicPageFrame";
import "./AboutPage.css";
import aboutHeroImage from "../../assets/public/hero-students.jpg";
import aboutBackdropImage from "../../assets/public/university-facade.jpg";

export default function AboutPage() {
  const pillars = [
    {
      eyebrow: "Protected access",
      title: "Private review",
      text: "Detailed found-item records stay with administrators until ownership can be verified.",
    },
    {
      eyebrow: "Simple reporting",
      title: "Cleaner submissions",
      text: "Students can share the essentials quickly without a long or confusing reporting flow.",
    },
    {
      eyebrow: "Verified return",
      title: "Trusted recovery",
      text: "Administrators handle the review process before any item is released back to a student.",
    },
  ];

  const steps = [
    {
      eyebrow: "Submission",
      title: "Report the item",
      text: "Students share what was lost, where it was last seen, and the details that can help identify it.",
    },
    {
      eyebrow: "Review",
      title: "Admin review",
      text: "Administrators compare student reports with private found-item records kept off the public side.",
    },
    {
      eyebrow: "Recovery",
      title: "Confirm ownership",
      text: "If a match looks right, the student is contacted for verification and the next recovery step.",
    },
  ];

  return (
    <PublicPageFrame active="about">
      <section className="section-shell about-hero">
        <div className="about-hero__copy">
          <div className="home-highlight-label">About the system</div>
          <h1 className="about-hero__title">A clearer campus recovery flow.</h1>
          <p className="about-hero__lead">
            The portal helps Hunter students report lost items, follow updates,
            and recover belongings through a private, administrator-led process.
          </p>

          <Link to="/contact" className="link-arrow">
            Contact support
            <span className="link-arrow__icon" aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        <div className="about-hero__visual">
          <div className="about-hero__backdrop">
            <img src={aboutBackdropImage} alt="A university building facade" />
          </div>
          <div className="about-hero__image">
            <img src={aboutHeroImage} alt="Two students working together in a library" />
          </div>
          <div className="about-hero__accent" aria-hidden="true"></div>
        </div>
      </section>

      <section className="section-shell about-pillars">
        <div className="home-highlight-label">Core ideas</div>
        <div className="about-pillars__grid">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="about-pillars__card">
              <span className="about-card__eyebrow">{pillar.eyebrow}</span>
              <h2>{pillar.title}</h2>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell about-process">
        <div className="home-highlight-label">How it works</div>
        <div className="about-process__grid">
          {steps.map((step) => (
            <article key={step.title} className="about-process__card">
              <span className="about-card__eyebrow">{step.eyebrow}</span>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell about-note">
        <div className="about-note__panel">
          <div className="home-highlight-label">Project note</div>
          <h2>Built for campus use.</h2>
          <p>
            The goal is simple: make lost-item reporting feel professional,
            secure, and easier to trust in a university setting.
          </p>

          <Link to="/privacy" className="link-arrow">
            Read privacy details
            <span className="link-arrow__icon" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>
    </PublicPageFrame>
  );
}
