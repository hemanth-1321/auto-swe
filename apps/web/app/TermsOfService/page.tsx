import React from "react";

export default function TermsOfService() {
  return (
    <div className="p-8 max-w-3xl mx-auto mt-20">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <p className="mb-4">
        Welcome to AutoSWE ("we", "our", or "us"). By using our AI Developer
        Agent for your GitHub repositories, you agree to comply with these Terms
        of Service.
      </p>

      <h2 className="text-2xl font-semibold mb-2 mt-4">Use of the Service</h2>
      <p className="mb-4">
        AutoSWE allows you to connect GitHub repositories and receive
        AI-generated code suggestions. You are responsible for reviewing,
        testing, and merging any pull requests created by the service.
      </p>

      <h2 className="text-2xl font-semibold mb-2 mt-4">
        User Responsibilities
      </h2>
      <ul className="list-disc list-inside mb-4">
        <li>Maintain the security of your GitHub account credentials.</li>
        <li>
          Ensure compliance with GitHub's Terms of Service and applicable laws.
        </li>
        <li>
          Review all code generated or suggested by AutoSWE before merging into
          your repositories.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-2 mt-4">
        Limitations and Disclaimers
      </h2>
      <p className="mb-4">
        AutoSWE is provided <strong>as-is</strong> without warranties of any
        kind. While we aim to provide helpful and accurate code suggestions, we
        cannot guarantee results, code correctness, or compatibility with your
        projects. Use the service at your own risk.
      </p>

      <h2 className="text-2xl font-semibold mb-2 mt-4">Termination</h2>
      <p className="mb-4">
        We reserve the right to suspend or terminate access to the service if
        these terms are violated or if abuse is detected.
      </p>

      <h2 className="text-2xl font-semibold mb-2 mt-4">Changes to Terms</h2>
      <p className="mb-4">
        We may update these Terms of Service from time to time. Continued use of
        AutoSWE after changes constitutes acceptance of the updated terms.
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
