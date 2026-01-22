import "../styles/contact.css";

const Contact = () => {
  return (
    <div className="contact-container">
      {/* Page Title */}
      <h1 className="contact-title">Contact Us</h1>
      <p className="contact-subtitle">
        Have questions about the AI Interview Platform? We’re here to help.
      </p>

      {/* Contact Info Grid */}
      <div className="contact-grid">
        {/* Address Card */}
        <div className="contact-card">
          <h3>📍 Our Address</h3>
          <p>
            AI Interview Solutions Pvt. Ltd.<br />
            3rd Floor, Tech Park Tower<br />
            Electronic City, Bengaluru<br />
            Karnataka – 560100
          </p>
        </div>

        {/* Phone Card */}
        <div className="contact-card">
          <h3>📞 Call Us</h3>
          <p>Customer Support (Mon–Fri)</p>
          <a href="tel:+919876543210" className="contact-link">
            +91 98765 43210
          </a>
        </div>

        {/* Email Card */}
        <div className="contact-card">
          <h3>📧 Email Us</h3>
          <p>For any queries or support</p>
          <a href="mailto:support@aiinterview.com" className="contact-link">
            support@aiinterview.com
          </a>
        </div>
      </div>

      {/* Query Section */}
      <div className="query-box">
        <h2>Any Query?</h2>
        <p>
          Reach out via email or phone — we’ll respond within
          <strong> 24 hours</strong>.
        </p>
      </div>

      {/* Google Map Section */}
      <div className="map-section">
        <h2>📍 Find Us Here</h2>
        <div className="map-container">
          <iframe
            title="Office Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.273494041145!2d77.660206!3d12.839939!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae6c9f9f5a7a41%3A0x6bb2b5a15e0c6a28!2sElectronic%20City%2C%20Bengaluru!5e0!3m2!1sen!2sin!4v1700000000000"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default Contact;
