// Real Confluence storage format from SWAPMEAT 0.19.0 patch notes
// Source: https://onemoregame.atlassian.net/wiki/spaces/OMG/pages/2550235145/
// Used as test fixture for confluence-converter.ts

export const SWAPMEAT_019_PATCH_NOTES = `<h2 local-id="8c8c629dc341"><strong><u>Shrines</u></strong></h2>
<p local-id="8f9ecbf8916d">Shrines are large monuments found around planets that players can interact with to gain a global Boon (buff), and sometimes are paired with a Curse (debuff), that lasts for a period of time, for the duration of the planet, or for the duration of a run.</p><ac:image ac:align="center" ac:layout="center" ac:original-height="608" ac:original-width="640" ac:custom-width="true" ac:local-id="fbb78bea0669" ac:alt="Shrine_InGame_FirstPass_PatchEmbed.gif" ac:width="640"><ri:attachment ri:filename="Shrine_InGame_FirstPass_PatchEmbed.gif" ri:version-at-save="1" /></ac:image>
<p local-id="d5ba5d88caaa">Players will be able to see a Shrine icon on the compass when they are within range. When a player finds the Shrine, it will be in a deactivated state. A player holds F to interact with the Shrine to begin the powering up process.</p>
<p local-id="4bd4ac446c28">Enemies are drawn to the area while the shrine is powering up. Players must defend the Shrine for a set time period of time. Shrines have health and can be destroyed, if one is destroyed, it does not activate.</p>
<p local-id="7d08942a0875">Modifications can be added to enemies and players based on these outcomes. If you\u2019re playing with friends, let them know to come help you with a Shrine! Completing them successfully is only upsides, while failing a Shrine may curse the entire team.</p>
<h2 local-id="90b2e85d-18fa-4403-832c-d2d87c09e943"><strong><u>Gameplay</u></strong></h2>
<ul local-id="dd61402631a3">
<li local-id="07dca5561ff3">
<p local-id="dc59b6cf08ec">A new event type called shrines has been added. Defend the shrine as it powers up and receive a buff. If it\u2019s destroyed you receive a boon. Wowy zowy</p></li>
<li local-id="06a1617b2a43">
<p local-id="e1c6b0edaed1">Currencies have been capped to a max value of 9999</p></li>
<li local-id="f0b0dac0bfdb">
<p local-id="463ccf06a936">Renamed \u201cElite Enemies\u201d to \u201cShiny Enemies\u201d \u2013 these are the golden glowing enemies that you\u2019ll find scattered throughout a planet</p></li>
<li local-id="a8c111df8601">
<p local-id="dd368945e6ff">Artifact Cubes will no longer drop randomly from enemies. These are now a guaranteed drop from Shiny Enemies</p></li>
<li local-id="719ea5eecb93">
<p local-id="70b1bbc4b8ba">Shiny Enemies no longer drop Item Containers or Meat</p></li>
<li local-id="e34531a5b00d">
<p local-id="21d6dcdee4ea">Removed the \u201cBasic Butchery\u201d Carl upgrade as it was redundant with the Butcher Flair.</p></li>
<li local-id="1e507fcc1284">
<p local-id="3ccfc026a468">Changed \u201cArmor of Chill\u201d Artifact into a \u201cFlash Freeze\u201d Artifact that now instantly freezes all enemies within a large radius of the player. Barrier is removed, but now you can tell them all to instantly take a chill pill!</p></li>
<li local-id="abe4e9d43bbc">
<p local-id="cc3a43728b1c">Overload Artifact has been beefed up big time. You move and shoot a lot faster now and have a bunch of extra jumps. Get out there and be a superhero!</p></li></ul>
<h2 local-id="301eb828edd1"><strong><u>AI</u></strong></h2>
<ul local-id="8798698ec5a6">
<li local-id="44ab5d605ca9">
<p local-id="6bed2aa67712">Added a new enemy that we\u2019re calling Meat Pug. It\u2019s supposed to be a fun enemy to engage with and not be difficult or tedious. We felt there was a missing \u201cfun fodder\u201d type enemy to go along with the Franken Meats. </p>
<ul local-id="c21a94383d1e">
<li local-id="4a47932058b1">
<p local-id="4b3110ad63f8">It shoots slow moving lasers out of its mouth, runs away if you get too close, and splits in two on death (twice). Squish them Meat Pug Pups! </p></li>
<li local-id="30f629cc579b">
<p local-id="d5be1c281ea0">We\u2019re mulling over whether splitting twice is too much or dumb fun. Would love feedback on that.</p></li>
<li local-id="2c6650373860"><ac:image ac:align="center" ac:layout="center" ac:original-height="600" ac:original-width="600" ac:custom-width="true" ac:local-id="a5460dd72509" ac:alt="MeatPugs_01.gif" ac:width="600"><ri:attachment ri:filename="MeatPugs_01.gif" ri:version-at-save="1" /></ac:image></li>
<li local-id="e297b410c467"><ac:image ac:align="center" ac:layout="center" ac:original-height="600" ac:original-width="600" ac:custom-width="true" ac:local-id="c1c39ee2a903" ac:alt="MeatPugs_02.gif" ac:width="600"><ri:attachment ri:filename="MeatPugs_02.gif" ri:version-at-save="1" /></ac:image></li></ul></li></ul>
<h2 local-id="9f9485a5-f723-4e5e-b064-73d0385dd99b"><strong><u>Animation</u></strong></h2><ac:image ac:align="center" ac:layout="center" ac:original-height="378" ac:original-width="640" ac:custom-width="true" ac:local-id="fa547152e675" ac:alt="squatsstaggers.gif" ac:width="640"><ri:attachment ri:filename="squatsstaggers.gif" ri:version-at-save="1" /></ac:image><ac:image ac:align="center" ac:layout="center" ac:original-height="342" ac:original-width="640" ac:custom-width="true" ac:local-id="c8dcbfc4bbec" ac:alt="MusclemManstagGif.gif" ac:width="640"><ri:attachment ri:filename="MusclemManstagGif.gif" ri:version-at-save="1" /></ac:image>
<p local-id="986095af8af4">New stagger animations for Squat Daddy, Dirtbag, Buster, Looger, Buzzle and Pestie. Here are a couple examples</p><ac:image ac:align="center" ac:layout="center" ac:original-height="378" ac:original-width="640" ac:custom-width="true" ac:local-id="9d8088e7487c" ac:alt="LittleAlienAttackGif.gif" ac:width="640"><ri:attachment ri:filename="LittleAlienAttackGif.gif" ri:version-at-save="1" /></ac:image>
<p local-id="56bb29fafb31">New animations for Little Alien across the board so he can show off his personality.</p>
<h2 local-id="cf8613dc-f4bb-4d43-9228-75aea7db7db0"><strong><u>UI / UX</u></strong></h2>
<ul local-id="88ca520ebe5d">
<li local-id="3c20963028a8">
<p local-id="44805fe90d1a">New Flair Terminal UI<br />Same functionality, new graphics! Players can still unlock and upgrade flair at the terminal. Stay tuned for more updates to come!</p><ac:image ac:align="center" ac:layout="center" ac:original-height="919" ac:original-width="1679" ac:custom-width="true" ac:local-id="91d997dc032a" ac:alt="image-20260303-004331.png" ac:width="736"><ri:attachment ri:filename="image-20260303-004331.png" ri:version-at-save="1" /></ac:image></li>
<li local-id="8cf67da51532">
<p local-id="c6981a039852">Exposed more detailed graphics options in the options menu. Vsync, target framerate, Anistropic Filtering, Anti-aliasing, texture and particle detail levels and more. You can still adjust the overall quality level of the graphics, but now you can also tweak individual settings to taste.</p></li>
<li local-id="0f40e4361b44">
<p local-id="1db6aface563">The Employee Handbook\u2019s FAQ tab now has an entry detailing Elements.</p><ac:image ac:align="center" ac:layout="center" ac:original-height="823" ac:original-width="1512" ac:custom-width="true" ac:local-id="b53cf36ca686" ac:width="736"><ri:attachment ri:filename="Screenshot 2026-03-04 at 1.09.26 PM.png" ri:version-at-save="1" /></ac:image></li>
<li local-id="4bbba3f72ade">
<p local-id="fb74b84ccbb0">Font updates are rolling out so you may notice some issues as we change things around.</p></li>
<li local-id="759f139922e3">
<p local-id="f4cd51fd6638">Damage numbers have been tweaked to make it easier to read, they no longer add up and damage numbers are shown individually.</p><ac:image ac:align="center" ac:layout="center" ac:original-height="380" ac:original-width="640" ac:custom-width="true" ac:local-id="31ee4c603193" ac:alt="DamageNumbers.gif" ac:width="640"><ri:attachment ri:filename="DamageNumbers.gif" ri:version-at-save="1" /></ac:image></li></ul>
<h2 local-id="384c25ca-7dd0-415b-9bbe-b4c5fd6e6941"><u>Art</u></h2>
<ul local-id="51ece47903e1">
<li local-id="640c89bbd2d3">
<p local-id="5218ed22bba9">Update starting rail gun and plasma caster colors to match other starting weapons</p></li>
<li local-id="dfae02bc22f9">
<p local-id="eb07d43bb717">Added sub regions/biomes to Barbecuria to help with navigation and give the map more character</p></li></ul><ac:image ac:align="center" ac:layout="center" ac:original-height="1028" ac:original-width="1958" ac:custom-width="true" ac:local-id="2f4410a9aabf" ac:alt="BarbecuriaRework01.png" ac:width="760"><ri:attachment ri:filename="BarbecuriaRework01.png" ri:version-at-save="1" /><ac:caption ac:local-id="8a5ccfc58012">
<p>Fungal Forest</p></ac:caption></ac:image><ac:image ac:align="center" ac:layout="center" ac:original-height="790" ac:original-width="2027" ac:custom-width="true" ac:local-id="636ee7545ee1" ac:alt="Barbecuria02.png" ac:width="760"><ri:attachment ri:filename="Barbecuria02.png" ri:version-at-save="1" /><ac:caption ac:local-id="6bdbcc3c7d06">
<p>Sand Worm Desert</p></ac:caption></ac:image><ac:image ac:align="center" ac:layout="center" ac:original-height="1028" ac:original-width="1958" ac:custom-width="true" ac:local-id="16f5d689a846" ac:alt="Barbecuria03.png" ac:width="760"><ri:attachment ri:filename="Barbecuria03.png" ri:version-at-save="1" /><ac:caption ac:local-id="b47a07d39ce3">
<p>Payload Exit in the Fungal Forest</p></ac:caption></ac:image><ac:image ac:align="center" ac:layout="center" ac:original-height="1028" ac:original-width="1958" ac:custom-width="true" ac:local-id="ef470cf65038" ac:alt="Barbecuria04.png" ac:width="760"><ri:attachment ri:filename="Barbecuria04.png" ri:version-at-save="1" /><ac:caption ac:local-id="db5ecf90d07b">
<p>The Crag Pools</p></ac:caption></ac:image>
<ul local-id="e345119ea994">
<li local-id="cd1d8e507ee1">
<p local-id="daffb6819b41">Updated the models of the thrown \u201cstarter\u201d heads to match their cosmetics. Previously, if you were wearing the Quack Ops head, it\u2019d turn into the Rangus Employee head when thrown. Now they are buttoned up visually.</p></li></ul>
<h2 local-id="09a99e98-1b35-4184-99a1-f058b38b8156"><u>Audio</u></h2>
<ul local-id="8e91db588180">
<li local-id="7d654a1808eb">
<p local-id="c4ea3211b59b">Roxie will now let you know what she thinks of your performance any time you die.</p></li>
<li local-id="0bac1678b460">
<p local-id="2f9137a6ad47">Updated some spots where old Roxie VO was still present.</p></li>
<li local-id="3b3b7c2660be">
<p local-id="8d0355b01eff">XP orbs now have a more pleasing pick up sound and ambient sound as they fly toward you.</p></li></ul>
<h2 local-id="29986a2f-b24b-42f4-99d7-e0facbe651d8"><strong><u>Bug Fixes</u></strong></h2>
<ul local-id="637e34b4-35b7-49e3-9075-39c313898fe2">
<li local-id="8423ee99-37ff-45b4-adcc-1879fe476bc9">
<p local-id="4157ef0733fa">Thrown turrets will no longer pass through solid surfaces, such as during the Meat Smoker or Glizzy Gulp Factory events.</p></li>
<li local-id="eabc1a5120cf">
<p local-id="58f10734381a">Fixed moleman leg ability continuing to \u201ctunnel\u201d when falling off a cliff</p></li>
<li local-id="e9eddb6ef71a">
<p local-id="060b5d8e6cb1">Fixed an issue where in run upgraded weapons could be retained when starting a new run</p></li>
<li local-id="8219c32c5df7">
<p local-id="320c58c82c2d">Fixed a bug that could cause the game to fail to launch if your key bindings file was corrupted.</p></li>
<li local-id="a2da3b58f69a">
<p local-id="994df43bb9f5">Fixed a bug that could cause Frank\u2019s minions (both little beans and elites) to spawn less frequently than designed.</p></li>
<li local-id="48b1298d125a">
<p local-id="bd8f1caab4e0">Fixed a physics bug that was causing Bean Minions to drop straight to the ground at Frank\u2019s feet instead of flying out in a ballistic arc.</p></li>
<li local-id="8d4e6c11d4da">
<p local-id="abd1bb34905e">Fixed a bug that could cause your character to be warped to the top side of structures if an enemy skill or ability pushed you into certain types of collision geometry.</p></li>
<li local-id="39e211dba0d3">
<p local-id="6ac25dee3dd2">Fixed a bug that could cause enemies to get stuck inside of the Kill Your TV event props.</p></li>
<li local-id="57719f6d8716">
<p local-id="c53d9b27b56d">Fixed a bug that could cause enemies to get stuck and stop moving if they landed on top of their spawner structures.</p></li>
<li local-id="5e24df7a85cc">
<p local-id="f4efbd69226d">Fixed a bug that was causing ZorpJet aliens not to shoot any projectiles at static targets.</p></li>
<li local-id="638532b3e589">
<p local-id="abafd9dccb54">Fixed a bug that would cause enemies not to die until after Freeze or Stagger effects were completed.</p></li>
<li local-id="afc78bfd2c1e">
<p local-id="3a0de04c0a8b">Fixed some typos where we were spelling \u201cSquishy\u201d as \u201cSquishie\u201d. Sorry, Squishy!</p></li></ul>
<h2 local-id="d16cafd1-eae5-4044-adcf-cb7027f054ae"><strong><u>Known Issues</u></strong></h2>
<ul local-id="62abbfc3-1671-4fd5-ac1b-e3546d40a324">
<li local-id="78ee819b-80e2-451e-bf01-85d9a5e9098b">
<p local-id="c08ff782-e3ce-4732-9369-21dcb0756fed">No significant performance tuning has been done yet. If you are graphics bound, you can try lowering the quality settings in the Esc menu via Options \u2192 Video, but systems with more constrained hardware may struggle</p></li>
<li local-id="fc95352e-57cc-4120-9a45-0578624bb393">
<p local-id="98f076b4-5b79-45f4-ba1a-2d665e518229">Not all input buttons and keys have icons in the UI yet. Text descriptions (eg. \u201cJ\u201d, or \u201cButton  West\u201d) will show up for things that do not yet have an icon in the input glyph map</p></li>
<li local-id="debd3ca8-a400-4c40-b9e2-70e7b76ec36c">
<p local-id="61c50514-0c22-42d1-96f3-b90768ba935a">When observing other players, some UI bits such as the reload HUD don\u2019t show accurate information for the observed player</p></li></ul>`;

// Expected BBCode output for Steam Announcements context
export const SWAPMEAT_019_EXPECTED_BBCODE = `[h2]Shrines[/h2]
Shrines are large monuments found around planets that players can interact with to gain a global Boon (buff), and sometimes are paired with a Curse (debuff), that lasts for a period of time, for the duration of the planet, or for the duration of a run.

[img]Shrine_InGame_FirstPass_PatchEmbed.gif[/img]

Players will be able to see a Shrine icon on the compass when they are within range. When a player finds the Shrine, it will be in a deactivated state. A player holds F to interact with the Shrine to begin the powering up process.

Enemies are drawn to the area while the shrine is powering up. Players must defend the Shrine for a set time period of time. Shrines have health and can be destroyed, if one is destroyed, it does not activate.

Modifications can be added to enemies and players based on these outcomes. If you\u2019re playing with friends, let them know to come help you with a Shrine! Completing them successfully is only upsides, while failing a Shrine may curse the entire team.

[h2]Gameplay[/h2]
[list]
[*]A new event type called shrines has been added. Defend the shrine as it powers up and receive a buff. If it\u2019s destroyed you receive a boon. Wowy zowy
[*]Currencies have been capped to a max value of 9999
[*]Renamed \u201cElite Enemies\u201d to \u201cShiny Enemies\u201d \u2013 these are the golden glowing enemies that you\u2019ll find scattered throughout a planet
[*]Artifact Cubes will no longer drop randomly from enemies. These are now a guaranteed drop from Shiny Enemies
[*]Shiny Enemies no longer drop Item Containers or Meat
[*]Removed the \u201cBasic Butchery\u201d Carl upgrade as it was redundant with the Butcher Flair.
[*]Changed \u201cArmor of Chill\u201d Artifact into a \u201cFlash Freeze\u201d Artifact that now instantly freezes all enemies within a large radius of the player. Barrier is removed, but now you can tell them all to instantly take a chill pill!
[*]Overload Artifact has been beefed up big time. You move and shoot a lot faster now and have a bunch of extra jumps. Get out there and be a superhero!
[/list]

[h2]AI[/h2]
[list]
[*]Added a new enemy that we\u2019re calling Meat Pug. It\u2019s supposed to be a fun enemy to engage with and not be difficult or tedious. We felt there was a missing \u201cfun fodder\u201d type enemy to go along with the Franken Meats.
[list]
[*]It shoots slow moving lasers out of its mouth, runs away if you get too close, and splits in two on death (twice). Squish them Meat Pug Pups!
[*]We\u2019re mulling over whether splitting twice is too much or dumb fun. Would love feedback on that.
[*][img]MeatPugs_01.gif[/img]
[*][img]MeatPugs_02.gif[/img]
[/list]
[/list]

[h2]Animation[/h2]
[img]squatsstaggers.gif[/img]
[img]MusclemManstagGif.gif[/img]

New stagger animations for Squat Daddy, Dirtbag, Buster, Looger, Buzzle and Pestie. Here are a couple examples

[img]LittleAlienAttackGif.gif[/img]

New animations for Little Alien across the board so he can show off his personality.

[h2]UI / UX[/h2]
[list]
[*]New Flair Terminal UI
Same functionality, new graphics! Players can still unlock and upgrade flair at the terminal. Stay tuned for more updates to come!
[img]image-20260303-004331.png[/img]
[*]Exposed more detailed graphics options in the options menu. Vsync, target framerate, Anistropic Filtering, Anti-aliasing, texture and particle detail levels and more. You can still adjust the overall quality level of the graphics, but now you can also tweak individual settings to taste.
[*]The Employee Handbook\u2019s FAQ tab now has an entry detailing Elements.
[img]Screenshot 2026-03-04 at 1.09.26 PM.png[/img]
[*]Font updates are rolling out so you may notice some issues as we change things around.
[*]Damage numbers have been tweaked to make it easier to read, they no longer add up and damage numbers are shown individually.
[img]DamageNumbers.gif[/img]
[/list]

[h2]Art[/h2]
[list]
[*]Update starting rail gun and plasma caster colors to match other starting weapons
[*]Added sub regions/biomes to Barbecuria to help with navigation and give the map more character
[/list]

[img]BarbecuriaRework01.png[/img]
Fungal Forest

[img]Barbecuria02.png[/img]
Sand Worm Desert

[img]Barbecuria03.png[/img]
Payload Exit in the Fungal Forest

[img]Barbecuria04.png[/img]
The Crag Pools

[list]
[*]Updated the models of the thrown \u201cstarter\u201d heads to match their cosmetics. Previously, if you were wearing the Quack Ops head, it\u2019d turn into the Rangus Employee head when thrown. Now they are buttoned up visually.
[/list]

[h2]Audio[/h2]
[list]
[*]Roxie will now let you know what she thinks of your performance any time you die.
[*]Updated some spots where old Roxie VO was still present.
[*]XP orbs now have a more pleasing pick up sound and ambient sound as they fly toward you.
[/list]

[h2]Bug Fixes[/h2]
[list]
[*]Thrown turrets will no longer pass through solid surfaces, such as during the Meat Smoker or Glizzy Gulp Factory events.
[*]Fixed moleman leg ability continuing to \u201ctunnel\u201d when falling off a cliff
[*]Fixed an issue where in run upgraded weapons could be retained when starting a new run
[*]Fixed a bug that could cause the game to fail to launch if your key bindings file was corrupted.
[*]Fixed a bug that could cause Frank\u2019s minions (both little beans and elites) to spawn less frequently than designed.
[*]Fixed a physics bug that was causing Bean Minions to drop straight to the ground at Frank\u2019s feet instead of flying out in a ballistic arc.
[*]Fixed a bug that could cause your character to be warped to the top side of structures if an enemy skill or ability pushed you into certain types of collision geometry.
[*]Fixed a bug that could cause enemies to get stuck inside of the Kill Your TV event props.
[*]Fixed a bug that could cause enemies to get stuck and stop moving if they landed on top of their spawner structures.
[*]Fixed a bug that was causing ZorpJet aliens not to shoot any projectiles at static targets.
[*]Fixed a bug that would cause enemies not to die until after Freeze or Stagger effects were completed.
[*]Fixed some typos where we were spelling \u201cSquishy\u201d as \u201cSquishie\u201d. Sorry, Squishy!
[/list]

[h2]Known Issues[/h2]
[list]
[*]No significant performance tuning has been done yet. If you are graphics bound, you can try lowering the quality settings in the Esc menu via Options \u2192 Video, but systems with more constrained hardware may struggle
[*]Not all input buttons and keys have icons in the UI yet. Text descriptions (eg. \u201cJ\u201d, or \u201cButton  West\u201d) will show up for things that do not yet have an icon in the input glyph map
[*]When observing other players, some UI bits such as the reload HUD don\u2019t show accurate information for the observed player
[/list]`;

// Notes on conversion decisions:
// 1. <h2><strong><u>Text</u></strong></h2> → [h2]Text[/h2] (strip redundant bold/underline inside headings)
// 2. <ac:image><ri:attachment ri:filename="X" /> → [img]X[/img] (filename only — needs URL resolution for Steam)
// 3. <ac:caption><p>Text</p></ac:caption> → Text on line after image (no BBCode caption tag)
// 4. <p> inside <li> → strip the <p> wrapper, just use the text content
// 5. Nested <ul> inside <li> → nested [list] (Steam supports this in Announcements)
// 6. local-id attributes → stripped entirely
// 7. HTML entities (rsquo, ldquo, rdquo, ndash, rarr) → Unicode characters
// 8. <br /> → newline
// 9. Empty <p /> elements → stripped
// 10. Image filenames with spaces ("Screenshot 2026-03-04 at 1.09.26 PM.png") → preserved as-is
