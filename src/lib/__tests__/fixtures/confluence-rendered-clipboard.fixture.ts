// Confluence rendered view clipboard HTML
// Obtained by ⌘A ⌘C from the rendered Confluence page for SWAPMEAT 0.19.0 patch notes
// This is what clipboardData.getData('text/html') returns when copying from Confluence's rendered view
// Key characteristics:
// - Standard HTML (h2, ul, li, p, strong, u) — NOT Confluence storage format (no ac: namespace)
// - Images are blob: URLs that won't work outside the browser session
// - Image filenames available in data-file-name attributes
// - Image captions in data-media-caption divs
// - Confluence UI junk: anchor buttons, SVG copy icons, loading spinners, CSS class soup
// - data-local-id, data-renderer-start-pos attributes throughout
// - Atlassian Sans font-family in inline styles

export const CONFLUENCE_RENDERED_CLIPBOARD_HTML = `<meta charset='utf-8'><h2 id="Shrines" data-local-id="8c8c629dc341" data-renderer-start-pos="1" style="margin: 0px; padding: 0px; color: rgb(41, 42, 46); font: 600 1.43em / 1.2 &quot;Atlassian Sans&quot;, ui-sans-serif, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, Ubuntu, &quot;Helvetica Neue&quot;, sans-serif; letter-spacing: normal; text-transform: none; scroll-margin-top: 48px; orphans: 2; text-align: start; text-indent: 0px; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: pre-wrap; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><strong data-renderer-mark="true" style="font-weight: 653;"><u data-renderer-mark="true">Shrines</u></strong></h2><p data-renderer-start-pos="10" data-local-id="8f9ecbf8916d" style="margin: 0.75em 0px 0px; padding: 0px;">Shrines are large monuments found around planets that players can interact with to gain a global Boon (buff), and sometimes are paired with a Curse (debuff), that lasts for a period of time, for the duration of the planet, or for the duration of a run.</p><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="Shrine_InGame_FirstPass_PatchEmbed.gif" data-file-mime-type="image/gif" data-alt="Shrine_InGame_FirstPass_PatchEmbed.gif" data-width="640" data-height="608"><img src="blob:https://example.atlassian.net/462e5524-3dfe-48a0-ad2d-c77b3adc75ca" alt="Shrine_InGame_FirstPass_PatchEmbed.gif"></div></div><p data-renderer-start-pos="267" data-local-id="d5ba5d88caaa">Players will be able to see a Shrine icon on the compass when they are within range. When a player finds the Shrine, it will be in a deactivated state. A player holds F to interact with the Shrine to begin the powering up process.</p><p data-renderer-start-pos="499" data-local-id="4bd4ac446c28">Enemies are drawn to the area while the shrine is powering up. Players must defend the Shrine for a set time period of time. Shrines have health and can be destroyed, if one is destroyed, it does not activate.</p><p data-renderer-start-pos="710" data-local-id="7d08942a0875">Modifications can be added to enemies and players based on these outcomes. If you're playing with friends, let them know to come help you with a Shrine! Completing them successfully is only upsides, while failing a Shrine may curse the entire team.</p><h2 id="Gameplay" data-local-id="90b2e85d" data-renderer-start-pos="960"><strong data-renderer-mark="true"><u data-renderer-mark="true">Gameplay</u></strong></h2><ul class="ak-ul" data-local-id="dd61402631a3" data-indent-level="1"><li><p data-local-id="dc59b6cf08ec">A new event type called shrines has been added. Defend the shrine as it powers up and receive a buff. If it's destroyed you receive a boon. Wowy zowy</p></li><li><p data-local-id="e1c6b0edaed1">Currencies have been capped to a max value of 9999</p></li><li><p data-local-id="463ccf06a936">Renamed "Elite Enemies" to "Shiny Enemies" – these are the golden glowing enemies that you'll find scattered throughout a planet</p></li><li><p data-local-id="dd368945e6ff">Artifact Cubes will no longer drop randomly from enemies. These are now a guaranteed drop from Shiny Enemies</p></li><li><p data-local-id="70b1bbc4b8ba">Shiny Enemies no longer drop Item Containers or Meat</p></li><li><p data-local-id="21d6dcdee4ea">Removed the "Basic Butchery" Carl upgrade as it was redundant with the Butcher Flair.</p></li><li><p data-local-id="3ccfc026a468">Changed "Armor of Chill" Artifact into a "Flash Freeze" Artifact that now instantly freezes all enemies within a large radius of the player. Barrier is removed, but now you can tell them all to instantly take a chill pill!</p></li><li><p data-local-id="cc3a43728b1c">Overload Artifact has been beefed up big time. You move and shoot a lot faster now and have a bunch of extra jumps. Get out there and be a superhero!</p></li></ul><h2 id="AI" data-local-id="301eb828edd1" data-renderer-start-pos="1947"><strong data-renderer-mark="true"><u data-renderer-mark="true">AI</u></strong></h2><ul class="ak-ul" data-local-id="8798698ec5a6" data-indent-level="1"><li><p data-local-id="6bed2aa67712">Added a new enemy that we're calling Meat Pug. It's supposed to be a fun enemy to engage with and not be difficult or tedious. We felt there was a missing "fun fodder" type enemy to go along with the Franken Meats.</p><ul class="ak-ul" data-local-id="c21a94383d1e" data-indent-level="2"><li><p data-local-id="4b3110ad63f8">It shoots slow moving lasers out of its mouth, runs away if you get too close, and splits in two on death (twice). Squish them Meat Pug Pups!</p></li><li><p data-local-id="d5be1c281ea0">We're mulling over whether splitting twice is too much or dumb fun. Would love feedback on that.</p></li></ul></li></ul><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="MeatPugs_01.gif" data-file-mime-type="image/gif" data-alt="MeatPugs_01.gif" data-width="600" data-height="600"><img src="blob:https://example.atlassian.net/fake-id-1" alt="MeatPugs_01.gif"></div></div><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="MeatPugs_02.gif" data-file-mime-type="image/gif" data-alt="MeatPugs_02.gif" data-width="600" data-height="600"><img src="blob:https://example.atlassian.net/fake-id-2" alt="MeatPugs_02.gif"></div></div><h2 id="Animation" data-local-id="9f9485a5" data-renderer-start-pos="2436"><strong data-renderer-mark="true"><u data-renderer-mark="true">Animation</u></strong></h2><p data-local-id="986095af8af4">New stagger animations for Squat Daddy, Dirtbag, Buster, Looger, Buzzle and Pestie. Here are a couple examples</p><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="squatsstaggers.gif" data-file-mime-type="image/gif" data-alt="squatsstaggers.gif" data-width="640" data-height="378"><img src="blob:https://example.atlassian.net/fake-id-3" alt="squatsstaggers.gif"></div></div><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="MusclemManstagGif.gif" data-file-mime-type="image/gif" data-alt="MusclemManstagGif.gif" data-width="640" data-height="342"><img src="blob:https://example.atlassian.net/fake-id-4" alt="MusclemManstagGif.gif"></div></div><p data-local-id="56bb29fafb31">New animations for Little Alien across the board so he can show off his personality.</p><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="LittleAlienAttackGif.gif" data-file-mime-type="image/gif" data-alt="LittleAlienAttackGif.gif" data-width="640" data-height="378"><img src="blob:https://example.atlassian.net/fake-id-5" alt="LittleAlienAttackGif.gif"></div></div><h2 id="UI-/-UX" data-local-id="cf8613dc" data-renderer-start-pos="2654"><strong data-renderer-mark="true"><u data-renderer-mark="true">UI / UX</u></strong></h2><ul class="ak-ul" data-local-id="88ca520ebe5d" data-indent-level="1"><li><p data-local-id="44805fe90d1a">New Flair Terminal UI</p><p>Same functionality, new graphics! Players can still unlock and upgrade flair at the terminal. Stay tuned for more updates to come!</p><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="image-20260303-004331.png" data-file-mime-type="image/png" data-alt="image-20260303-004331.png" data-width="1679" data-height="919"><img src="blob:https://example.atlassian.net/fake-id-6" alt="image-20260303-004331.png"></div></div></li><li><p data-local-id="c6981a039852">Exposed more detailed graphics options in the options menu. Vsync, target framerate, Anistropic Filtering, Anti-aliasing, texture and particle detail levels and more. You can still adjust the overall quality level of the graphics, but now you can also tweak individual settings to taste.</p></li><li><p data-local-id="1db6aface563">The Employee Handbook's FAQ tab now has an entry detailing Elements.</p><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="Screenshot 2026-03-04 at 1.09.26 PM.png" data-file-mime-type="image/png" data-alt="" data-width="1512" data-height="823"><img src="blob:https://example.atlassian.net/fake-id-7" alt=""></div></div></li><li><p data-local-id="fb74b84ccbb0">Font updates are rolling out so you may notice some issues as we change things around.</p></li><li><p data-local-id="f4cd51fd6638">Damage numbers have been tweaked to make it easier to read, they no longer add up and damage numbers are shown individually.</p><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="DamageNumbers.gif" data-file-mime-type="image/gif" data-alt="DamageNumbers.gif" data-width="640" data-height="380"><img src="blob:https://example.atlassian.net/fake-id-8" alt="DamageNumbers.gif"></div></div></li></ul><h2 id="Art" data-local-id="384c25ca" data-renderer-start-pos="3411"><u data-renderer-mark="true">Art</u></h2><ul class="ak-ul" data-local-id="51ece47903e1" data-indent-level="1"><li><p data-local-id="5218ed22bba9">Update starting rail gun and plasma caster colors to match other starting weapons</p></li><li><p data-local-id="eb07d43bb717">Added sub regions/biomes to Barbecuria to help with navigation and give the map more character</p></li></ul><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="BarbecuriaRework01.png" data-file-mime-type="image/png" data-alt="BarbecuriaRework01.png" data-width="1958" data-height="1028"><img src="blob:https://example.atlassian.net/fake-id-9" alt="BarbecuriaRework01.png"></div><div data-media-caption="true">Fungal Forest</div></div><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="Barbecuria02.png" data-file-mime-type="image/png" data-alt="Barbecuria02.png" data-width="2027" data-height="790"><img src="blob:https://example.atlassian.net/fake-id-10" alt="Barbecuria02.png"></div><div data-media-caption="true">Sand Worm Desert</div></div><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="Barbecuria03.png" data-file-mime-type="image/png" data-alt="Barbecuria03.png" data-width="1958" data-height="1028"><img src="blob:https://example.atlassian.net/fake-id-11" alt="Barbecuria03.png"></div><div data-media-caption="true">Payload Exit in the Fungal Forest</div></div><div data-node-type="mediaSingle" data-layout="center"><div data-type="file" data-node-type="media" data-file-name="Barbecuria04.png" data-file-mime-type="image/png" data-alt="Barbecuria04.png" data-width="1958" data-height="1028"><img src="blob:https://example.atlassian.net/fake-id-12" alt="Barbecuria04.png"></div><div data-media-caption="true">The Crag Pools</div></div><ul class="ak-ul" data-local-id="e345119ea994" data-indent-level="1"><li><p data-local-id="daffb6819b41">Updated the models of the thrown "starter" heads to match their cosmetics. Previously, if you were wearing the Quack Ops head, it'd turn into the Rangus Employee head when thrown. Now they are buttoned up visually.</p></li></ul><h2 id="Audio" data-local-id="09a99e98" data-renderer-start-pos="3919"><u data-renderer-mark="true">Audio</u></h2><ul class="ak-ul" data-local-id="8e91db588180" data-indent-level="1"><li><p data-local-id="c4ea3211b59b">Roxie will now let you know what she thinks of your performance any time you die.</p></li><li><p data-local-id="2f9137a6ad47">Updated some spots where old Roxie VO was still present.</p></li><li><p data-local-id="8d0355b01eff">XP orbs now have a more pleasing pick up sound and ambient sound as they fly toward you.</p></li></ul><h2 id="Bug-Fixes" data-local-id="29986a2f" data-renderer-start-pos="4165"><strong data-renderer-mark="true"><u data-renderer-mark="true">Bug Fixes</u></strong></h2><ul class="ak-ul" data-local-id="637e34b4" data-indent-level="1"><li><p data-local-id="4157ef0733fa">Thrown turrets will no longer pass through solid surfaces, such as during the Meat Smoker or Glizzy Gulp Factory events.</p></li><li><p data-local-id="58f10734381a">Fixed moleman leg ability continuing to "tunnel" when falling off a cliff</p></li><li><p data-local-id="060b5d8e6cb1">Fixed an issue where in run upgraded weapons could be retained when starting a new run</p></li><li><p data-local-id="320c58c82c2d">Fixed a bug that could cause the game to fail to launch if your key bindings file was corrupted.</p></li><li><p data-local-id="994df43bb9f5">Fixed a bug that could cause Frank's minions (both little beans and elites) to spawn less frequently than designed.</p></li><li><p data-local-id="bd8f1caab4e0">Fixed a physics bug that was causing Bean Minions to drop straight to the ground at Frank's feet instead of flying out in a ballistic arc.</p></li><li><p data-local-id="abd1bb34905e">Fixed a bug that could cause your character to be warped to the top side of structures if an enemy skill or ability pushed you into certain types of collision geometry.</p></li><li><p data-local-id="6ac25dee3dd2">Fixed a bug that could cause enemies to get stuck inside of the Kill Your TV event props.</p></li><li><p data-local-id="c53d9b27b56d">Fixed a bug that could cause enemies to get stuck and stop moving if they landed on top of their spawner structures.</p></li><li><p data-local-id="f4efbd69226d">Fixed a bug that was causing ZorpJet aliens not to shoot any projectiles at static targets.</p></li><li><p data-local-id="abafd9dccb54">Fixed a bug that would cause enemies not to die until after Freeze or Stagger effects were completed.</p></li><li><p data-local-id="3a0de04c0a8b">Fixed some typos where we were spelling "Squishy" as "Squishie". Sorry, Squishy!</p></li></ul><h2 id="Known-Issues" data-local-id="d16cafd1" data-renderer-start-pos="5499"><strong data-renderer-mark="true"><u data-renderer-mark="true">Known Issues</u></strong></h2><ul class="ak-ul" data-local-id="62abbfc3" data-indent-level="1"><li><p data-local-id="c08ff782">No significant performance tuning has been done yet. If you are graphics bound, you can try lowering the quality settings in the Esc menu via Options → Video, but systems with more constrained hardware may struggle</p></li><li><p data-local-id="98f076b4">Not all input buttons and keys have icons in the UI yet. Text descriptions (eg. "J", or "Button West") will show up for things that do not yet have an icon in the input glyph map</p></li><li><p data-local-id="61c50514">When observing other players, some UI bits such as the reload HUD don't show accurate information for the observed player</p></li></ul>`;

// Expected BBCode output from the rendered clipboard HTML
export const EXPECTED_RENDERED_BBCODE = `[h2]Shrines[/h2]
Shrines are large monuments found around planets that players can interact with to gain a global Boon (buff), and sometimes are paired with a Curse (debuff), that lasts for a period of time, for the duration of the planet, or for the duration of a run.

[b]>>> Drop image: Shrine_InGame_FirstPass_PatchEmbed.gif <<<[/b]

Players will be able to see a Shrine icon on the compass when they are within range. When a player finds the Shrine, it will be in a deactivated state. A player holds F to interact with the Shrine to begin the powering up process.

Enemies are drawn to the area while the shrine is powering up. Players must defend the Shrine for a set time period of time. Shrines have health and can be destroyed, if one is destroyed, it does not activate.

Modifications can be added to enemies and players based on these outcomes. If you're playing with friends, let them know to come help you with a Shrine! Completing them successfully is only upsides, while failing a Shrine may curse the entire team.

[h2]Gameplay[/h2]
[list]
[*]A new event type called shrines has been added. Defend the shrine as it powers up and receive a buff. If it's destroyed you receive a boon. Wowy zowy
[*]Currencies have been capped to a max value of 9999
[*]Renamed "Elite Enemies" to "Shiny Enemies" – these are the golden glowing enemies that you'll find scattered throughout a planet
[*]Artifact Cubes will no longer drop randomly from enemies. These are now a guaranteed drop from Shiny Enemies
[*]Shiny Enemies no longer drop Item Containers or Meat
[*]Removed the "Basic Butchery" Carl upgrade as it was redundant with the Butcher Flair.
[*]Changed "Armor of Chill" Artifact into a "Flash Freeze" Artifact that now instantly freezes all enemies within a large radius of the player. Barrier is removed, but now you can tell them all to instantly take a chill pill!
[*]Overload Artifact has been beefed up big time. You move and shoot a lot faster now and have a bunch of extra jumps. Get out there and be a superhero!
[/list]

[h2]AI[/h2]
[list]
[*]Added a new enemy that we're calling Meat Pug. It's supposed to be a fun enemy to engage with and not be difficult or tedious. We felt there was a missing "fun fodder" type enemy to go along with the Franken Meats.
[*]It shoots slow moving lasers out of its mouth, runs away if you get too close, and splits in two on death (twice). Squish them Meat Pug Pups!
[*]We're mulling over whether splitting twice is too much or dumb fun. Would love feedback on that.
[/list]

[b]>>> Drop image: MeatPugs_01.gif <<<[/b]
[b]>>> Drop image: MeatPugs_02.gif <<<[/b]

[h2]Animation[/h2]
New stagger animations for Squat Daddy, Dirtbag, Buster, Looger, Buzzle and Pestie. Here are a couple examples

[b]>>> Drop image: squatsstaggers.gif <<<[/b]
[b]>>> Drop image: MusclemManstagGif.gif <<<[/b]

New animations for Little Alien across the board so he can show off his personality.

[b]>>> Drop image: LittleAlienAttackGif.gif <<<[/b]

[h2]UI / UX[/h2]
[list]
[*]New Flair Terminal UI
Same functionality, new graphics! Players can still unlock and upgrade flair at the terminal. Stay tuned for more updates to come!
[b]>>> Drop image: image-20260303-004331.png <<<[/b]
[*]Exposed more detailed graphics options in the options menu. Vsync, target framerate, Anistropic Filtering, Anti-aliasing, texture and particle detail levels and more. You can still adjust the overall quality level of the graphics, but now you can also tweak individual settings to taste.
[*]The Employee Handbook's FAQ tab now has an entry detailing Elements.
[b]>>> Drop image: Screenshot 2026-03-04 at 1.09.26 PM.png <<<[/b]
[*]Font updates are rolling out so you may notice some issues as we change things around.
[*]Damage numbers have been tweaked to make it easier to read, they no longer add up and damage numbers are shown individually.
[b]>>> Drop image: DamageNumbers.gif <<<[/b]
[/list]

[h2]Art[/h2]
[list]
[*]Update starting rail gun and plasma caster colors to match other starting weapons
[*]Added sub regions/biomes to Barbecuria to help with navigation and give the map more character
[/list]

[b]>>> Drop image: BarbecuriaRework01.png <<<[/b]
Fungal Forest

[b]>>> Drop image: Barbecuria02.png <<<[/b]
Sand Worm Desert

[b]>>> Drop image: Barbecuria03.png <<<[/b]
Payload Exit in the Fungal Forest

[b]>>> Drop image: Barbecuria04.png <<<[/b]
The Crag Pools

[list]
[*]Updated the models of the thrown "starter" heads to match their cosmetics. Previously, if you were wearing the Quack Ops head, it'd turn into the Rangus Employee head when thrown. Now they are buttoned up visually.
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
[*]Fixed moleman leg ability continuing to "tunnel" when falling off a cliff
[*]Fixed an issue where in run upgraded weapons could be retained when starting a new run
[*]Fixed a bug that could cause the game to fail to launch if your key bindings file was corrupted.
[*]Fixed a bug that could cause Frank's minions (both little beans and elites) to spawn less frequently than designed.
[*]Fixed a physics bug that was causing Bean Minions to drop straight to the ground at Frank's feet instead of flying out in a ballistic arc.
[*]Fixed a bug that could cause your character to be warped to the top side of structures if an enemy skill or ability pushed you into certain types of collision geometry.
[*]Fixed a bug that could cause enemies to get stuck inside of the Kill Your TV event props.
[*]Fixed a bug that could cause enemies to get stuck and stop moving if they landed on top of their spawner structures.
[*]Fixed a bug that was causing ZorpJet aliens not to shoot any projectiles at static targets.
[*]Fixed a bug that would cause enemies not to die until after Freeze or Stagger effects were completed.
[*]Fixed some typos where we were spelling "Squishy" as "Squishie". Sorry, Squishy!
[/list]

[h2]Known Issues[/h2]
[list]
[*]No significant performance tuning has been done yet. If you are graphics bound, you can try lowering the quality settings in the Esc menu via Options → Video, but systems with more constrained hardware may struggle
[*]Not all input buttons and keys have icons in the UI yet. Text descriptions (eg. "J", or "Button West") will show up for things that do not yet have an icon in the input glyph map
[*]When observing other players, some UI bits such as the reload HUD don't show accurate information for the observed player
[/list]`;
