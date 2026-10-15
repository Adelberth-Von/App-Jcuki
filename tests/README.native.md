# Native regression checks

The Android smoke test boots the release APK on an Android emulator, checks focused input positions with the keyboard visible, creates one clearly labelled QA account through the public application flow, verifies profile/group recovery after clearing that emulator's application data, and verifies the authenticated avatar cache after restart/offline.

The QA account uses a unique `jcuki.qa.native.*@example.com` address and a random password kept only in the runner process. No verification email is sent. It contains test profile/group data only; no existing users' data is changed or deleted. Public client configuration is used; no service-role key is needed or logged. QA records remain clearly labelled in the development Supabase project.

Native failure artifacts contain screenshots and the test UI hierarchy, not tokens/password logs. Browser checks remain useful for layout and three-user scheduling, but they cannot prove IME or native filesystem behavior.
