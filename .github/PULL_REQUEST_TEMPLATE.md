---
name: Pull Request
about: Use this template for code changes
labels: ''
assignees: ''
---

## Summary

Provide a short description of what this PR changes and why.

- Related issue: (e.g., closes #123)
- Type: (feat | fix | chore | docs | style | refactor | test)

## Changes

List the main changes in bullet points:
- Change A
- Change B

## How to test / QA steps

Provide clear instructions for verifying the change locally:
1. Checkout branch: `git checkout feature/your-branch`
2. Ensure base branch: `git rebase develop` (or merge develop)
3. Run: commands to reproduce or verify

## Checklist

- [ ] The code follows the repository's style guidelines
- [ ] Tests added or updated where applicable
- [ ] Linting passes
- [ ] Documentation updated (README, module docs)
- [ ] PR targets the `develop` branch (per GitFlow)
- [ ] Conventional Commit-style title used (e.g., `feat(auth): add login endpoint`)

## Breaking changes

If this PR introduces breaking changes, describe them and any migration steps required.

## Notes for reviewers

Anything reviewers should pay special attention to (design choices, performance, security).