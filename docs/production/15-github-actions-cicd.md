# GitHub Actions CI/CD Pipeline & Continuous Security Specification
**Document Reference**: `docs/production/15-github-actions-cicd.md`  
**Phase**: Part 14 – Production Hardening, Analytics, Audit Logs, Security Review, Performance Optimization, Deployment & CI/CD  
**Platform**: BookMyShow-Like Enterprise Multi-Tenant Movie Ticket Booking Platform  
**Authors**: Senior DevOps Engineer, Security Engineer  
**Status**: APPROVED  

---

## 1. Pipeline Overview & Automation Strategy

Continuous Integration and Continuous Deployment (CI/CD) guarantees that code committed to the repository meets quality gates, security standards, and operational readiness before merging or deploying.

The pipeline comprises three distinct workflows:
1. **Core Verification Pipeline (`ci.yml`)**: Triggered on all pushes and pull requests to `main`, `master`, and `develop`.
2. **Security & Vulnerability Scanner (`security.yml`)**: Automated npm dependency audit and TruffleHog secret scanning.
3. **Container Build & Image Scan (`docker-build.yml`)**: Docker multi-stage container build validation and Aqua Security Trivy vulnerability scan.

---

## 2. Pipeline Execution Stages

```
   [ Git Push / PR ]
           |
           +---------------------------------------+
           |                                       |
           v                                       v
    [ ci.yml Job ]                       [ security.yml Job ]
           |                                       |
  1. actions/checkout@v4                  1. actions/checkout@v4
  2. actions/setup-node@v4                2. npm audit (--audit-level=high)
  3. npm ci (clean install)               3. TruffleHog secret detection
  4. npm run format:check (Prettier)               |
  5. npm run lint (ESLint)                         v
  6. npm test (Jest unit & integration)  [ Passed Quality Gate ]
  7. npm run test:coverage                         |
  8. upload-artifact (coverage)                    v
           |                             [ docker-build.yml ]
           v                                       |
  [ All Tests Green ]                     1. docker buildx
                                          2. Multi-stage build
                                          3. Trivy Container Scan
                                                   |
                                                   v
                                          [ Ready for Deployment ]
```

---

## 3. Quality Gate Policies & Rules

1. **Branch Protection**: Direct commits to `main` and `develop` are prohibited. All code merges require PR approvals and green CI status checks.
2. **Strict Test Pass Threshold**: 100% of automated test suites must pass (77+ suites). A single test regression blocks the merge.
3. **Zero Linting Tolerances**: ESLint must report 0 errors and 0 warnings.
4. **Clean Dependencies**: Production dependencies must be installed with `npm ci` referencing `package-lock.json` directly.
5. **Secret Protection**: Production secrets are never exposed in CI runner logs. Testing uses mock strings and in-memory databases.

