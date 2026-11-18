# Verification — 2026-11-18

- All 13 Node tests pass. These include deterministic traversal of all five courses using running and jumping inputs, without changing player position or health. Each run reaches its exit and collects consoles.
- Boss logic checks cover the warning, leap, landing, vulnerable window, six hits, and victory. This test positions the player for collision fixtures; it is not a complete human playthrough.
- Animation checks cover all six run poses, stopping without foot sliding, paused animation, immediate jump response, apex, fall, and landing. Boss tests verify the complete slam/throw/charge cycle, recovery after each attack, projectile damage, three-console volleys in phase two, and faster phase-two charges.
- Browser animation capture observed run frames 4–9, idle within 130 ms of releasing movement, separate jump/fall poses, three distinct warning/attack pose pairs, and hit recoil. Boss capture temporarily enables player invulnerability to inspect every attack; it is not a survival playthrough.
- The isolated Chromium browser passed 15 UI checks with touch emulation at 375×667, 390×844, and 844×390. Real CDP multi-touch events held direction and jump simultaneously, and releasing both cleared the held inputs.
- Confirmed pause freezes simulation, backgrounding pauses, sound toggle works, locked courses stay locked, completing a course unlocks the next, reload restores progress, and boss victory is saved. Completion UI tests use local-only collision fixtures.
- Inspected screenshots of the title screen, gameplay, level-one billboard, boss, small portrait screen, and landscape layout. No browser JavaScript errors were observed.
- The copy-link/device-detection gate is removed. Starting the game and resizing work even when the browser reports no touch support. Controls remain designed for mobile; no keyboard gameplay is enabled.

These checks use browser emulation, not a physical iPhone or Android device. Actual Safari behavior and device performance have not been measured.
