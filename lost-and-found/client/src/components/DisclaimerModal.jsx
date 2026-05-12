import { useEffect, useState } from "react";
import "./DisclaimerModal.css";

const STORAGE_KEY = "laf-disclaimer-acknowledged";

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY);
    if (!acknowledged) setIsOpen(true);
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="disclaimer-modal" role="dialog" aria-modal="true">
      <div className="disclaimer-modal__backdrop" />
      <div className="disclaimer-modal__card">
        <h2 className="disclaimer-modal__title">Disclaimer</h2>
        <p className="disclaimer-modal__body">
          This is a student capstone project and is not affiliated with,
          endorsed by, or sponsored by Hunter College or The City University
          of New York.
        </p>
        <button
          type="button"
          onClick={handleAcknowledge}
          className="disclaimer-modal__btn"
        >
          <span className="disclaimer-modal__btn-face">I Understand</span>
        </button>
      </div>
    </div>
  );
}
