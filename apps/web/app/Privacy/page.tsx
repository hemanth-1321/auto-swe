import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="p-8 max-w-3xl mx-auto mt-20">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <p className="mb-4">
        AutoSWE ("we", "our", or "us") respects your privacy. This Privacy
        Policy explains how we collect, use, and protect information when you
        use our AI Developer Agent for your GitHub repositories.
      </p>

      <h2 className="text-2xl font-semibold mb-2 mt-4">
        Information We Collect
      </h2>
      <p className="mb-4">
        When you connect your GitHub account or repositories, we may collect:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Basic account information (username, email)</li>
        <li>Repository data (public and selected private repositories)</li>
        <li>Usage data to improve AI code suggestions</li>
      </ul>

      <h2 className="text-2xl font-semibold mb-2 mt-4">How We Use Your Data</h2>
      <p className="mb-4">
        Your data is used solely to provide AI-powered code suggestions,
        automate pull requests, and improve our service. We do{" "}
        <strong>not</strong> sell or share your data with third parties.
      </p>

      <h2 className="text-2xl font-semibold mb-2 mt-4">Data Security</h2>
      <p className="mb-4">
        We implement industry-standard measures to protect your data. All
        sensitive information is stored securely and access is restricted.
      </p>

      <h2 className="text-2xl font-semibold mb-2 mt-4">Your Choices</h2>
      <p className="mb-4">
        You can disconnect your GitHub account or request deletion of your data
        at any time by contacting us at{" "}
        <a href="mailto:support@example.com" className=" underline">
          support@example.com
        </a>
        .
      </p>

      <h2 className="text-2xl font-semibold mb-2 mt-4">
        Updates to This Policy
      </h2>
      <p className="mb-4">
        We may update this Privacy Policy from time to time. We will notify
        users of significant changes via email or in-app notifications.
      </p>

      <p className="mt-6">
        Last updated:{" "}
        {new Date().toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
    </div>
  );
}
