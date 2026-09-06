# iOS archive investigation — 2026-09-07

## Recovery and upload confirmed

- At 01:00 CEST, the retry with full filesystem access completed with `ARCHIVE SUCCEEDED`.
- Archived app: `it.kreluna.cosmora`, version `1.0`, build `24`, team `KMQA59LC4T`.
- At 01:02:51 CEST, App Store Connect reported `Uploaded package is processing`, `Upload succeeded`, and `EXPORT SUCCEEDED`.
- Archive retained at `/Users/andreagadducci/Library/Developer/Xcode/Archives/2026-09-07/COSMORA 1.0 (24).xcarchive`.
- Upload completion is confirmed; processing completion, tester assignment, installability and App Store review submission have not yet been verified.

## Earlier failed attempts (historical)

- Release uses manual Apple Distribution signing, team `KMQA59LC4T`, profile `COSMORA Kreluna App Store`. No signing settings changed during this investigation.
- The screenshot's automatic Development profile error is distinct from the Release archive stall.
- Archive attempts using a PTY and subsequently `-jobs 1` both stalled in the initial compiler discovery command (`clang -v -E -dM ... -x c -c /dev/null`). Both attempts were interrupted; neither produced an uploadable archive.
- A one-second process sample of the stalled clang process showed all 874 samples in `write`, called from `clang::driver::Command::Print` via LLVM raw output streams. Evidence: `/tmp/cosmora-clang-hang-sample.txt` (local diagnostic, not a repository artifact).
- This identifies the immediate blocking operation, not a proven underlying cause. Output-pipe handling is a hypothesis. No compiler replacements or certificate revocations were performed.
- Next recovery step: save other work and restart macOS, then retry the Release archive. A restart is not guaranteed to fix the issue. Do not claim TestFlight upload or App Store submission until independently confirmed.
