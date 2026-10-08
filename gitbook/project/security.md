# Security policy

The workbench is a static page with a strict CSP; it makes no network requests after load and holds no secrets. Report files are parsed locally and never uploaded. Report vulnerabilities (markup injection from report content, a CSP weakening, a way to make a failing run display as passing) through GitHub's private vulnerability reporting for this repository, not a public issue.
