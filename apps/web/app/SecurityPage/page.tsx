import React from "react";

export default function SecurityPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto mt-20">
      <h1 className="text-3xl font-bold mb-6">Security</h1>
      <p className="mb-4">
        At AutoSWE, we take the security of your data seriously. This page
        explains how we protect your GitHub account information and
        repositories.
      </p>
      <h2 className="text-2xl font-semibold mb-2 mt-4">Data Protection</h2>
      <ul className="list-disc list-inside mb-4">
        <li>
          All data is transmitted over{" "}
          <strong>encrypted HTTPS connections</strong>.
        </li>
        <li>
          GitHub access tokens are stored securely and used only for AI code
          generation tasks.
        </li>
        <li>
          We do not share your repository data or personal information with
          third parties.
        </li>
      </ul>
      <h2 className="text-2xl font-semibold mb-2 mt-4">Access Control</h2>
      <ul className="list-disc list-inside mb-4">
        <li>
          Access to sensitive data is restricted to authorized systems only.
        </li>
        <li>
          Regular audits are performed to ensure security standards are
          maintained.
        </li>
        <li>
          We follow best practices for credential management and system
          security.
        </li>
      </ul>
      <h2 className="text-2xl font-semibold mb-2 mt-4">
        User Responsibilities
      </h2>
      <p className="mb-4">
        You should also maintain the security of your GitHub account by using
        strong passwords and enabling two-factor authentication.
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
