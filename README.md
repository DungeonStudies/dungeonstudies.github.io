# Dungeon Studies — Tower of Trials

A single self-contained `index.html` — a retro pixel-art (16-bit style) RPG
dungeon crawler where every combat turn is a question pulled from **your own
study material**. Answer correctly and your character attacks; answer wrong
and the enemy hits back. No build step, no server — just open `index.html`.

The look: hand-drawn 16-bit pixel art — five 32x32 chibi heroes with real
frame-by-frame idle, walk and attack cycles, and twenty-two creatures and bosses
drawn to match, standing in a pixel dungeon of torchlit masonry, a perspective flagstone
floor and a voussoir arch, wrapped in a modern dark-fantasy UI.

## More tones, not more pixels

"More bit" is not a resolution. What separates 8-bit art from 16-bit art is the
number of tones between the darkest and the lightest part of one material, and
where they are put — so nothing here was redrawn, and every sprite in the game
got richer at once because both generators do the lighting.

The heroes had exactly **one** lighting pass: a highlight on broad flat tops.
They now get three more tones, derived from each palette rather than
hand-picked:

| | what it is |
|---|---|
| **key** | a rung above the top of a ramp, where the light hits square on — a shoulder, a helm crown, the top of a shield |
| **occlusion** | a rung below the bottom, packed into the seams where two forms meet: under a jaw, beneath an arm, where a cloak tucks behind a leg |
| **rim** | a cool edge down the shaded side, which separates the figure from the room without an outline |

Two mistakes were worth the detour. The first was **one highlight for the whole
figure**: derived off the warrior's `3` it came out pink, because `3` is his
*cape*, and his steel shoulders were being lit with it. Every palette carries
three separate ramps — cloth, leather, metal — so each gets its own key.

The second was **one rim colour for the whole figure**, and it was worse:
painted down every right edge regardless of material it put a pale lavender
stripe on the brawler's bare arm and turned the rogue's dagger into a smear. It
read as a rendering fault, not as light. A rim is light on a *surface*, so it
keeps the colour of whatever it falls on — and it only draws where at least
three edge pixels run together, because a lone lit pixel on an edge looks like
a bug.

The creatures already had volume from a different model — distance to the
silhouette picks the tone, so the edge is darkest and the mass lights toward
its middle. What that has no notion of is a light *direction*, which is why a
basilisk stood next to a relit mage looked like a flat cut-out beside him. They
get the same key and rim, in their own colours.

## Sprites, frames and animation

Everything is drawn by hand as pixel art and animated the way 16-bit games
animated: **one whole grid per frame**. No limb is ever rotated, slid or scaled
on its own, so nothing reads as a paper cut-out.

Each hero is a **32x32 chibi sheet** — a big head and simplified body so the
character stays readable at thumbnail size — built from authored layers (cloak,
head, torso, per-pose arm and leg blocks, weapons stroked in so a blade can sit
at any angle) that are composited into flat frames.

Heads are drawn in **three-quarter view, facing right**. The back of the skull
is the heavier, darker mass and the face opening sits forward, so the hero looks
at the enemy rather than out of the screen; the battle scene mirrors the monster,
which turns it to look back.

The direction is grim, not cute. **Nobody has a face.** Every head is a closed
helm, a deep hood or a wrap, the face behind it is a black void, and the pair of
lit eyes looking out of that void is the brightest thing on the sprite. Each
class runs on **16 colours**: a low, near-black material ramp, one dull metal
trim, and exactly one glow — ember for the horned dread-knight, cold blue for
the hooded warlock, amber for the assassin, gold for the haloed cleric, blood
red for the masked pit-fighter. Cloaks hang behind the body as a darker void
still, torn along the hem, and sway with the walk. A pixel only brightens where
a broad flat form turns up into the light, and it brightens one rung up its own
material ramp, so a highlight always stays the colour of what it sits on.

- **Idle, 6 frames.** The head and shoulder line travel exactly one pixel and
  no more; the arms, weapon and feet never move. Six frames rather than two is
  what keeps it from snapping — the lift is padded on either side by frames that
  only change light, so the chest brightens one rung up its own ramp before the
  shoulders follow. The cloak hem drifts a pixel and the hot core of the eyes
  flickers. Two frames on an even cycle is a heartbeat; this eases.
- **Walk, 4 frames.** Contact, passing, contact, passing, with the legs and the
  swinging arms redrawn pixel by pixel. Robed classes get a hem that swings
  instead of legs.
- **Attack, 3 frames.** Wind up, strike, follow through; it plays once and holds
  on the last frame. The warrior raises and cuts down, the rogue throws both
  daggers through, the brawler's punch is drawn forearm and all, and the casters
  plant the staff and push the spell out.
- **Hurt, 1 frame,** with the head snapped back a pixel.

A clip renders all of its frames into a stack and CSS cuts between them with
hard opacity stops, so playback costs nothing at runtime and collapses to a
single still frame under `prefers-reduced-motion`. Combat chains the clips: a
dash or a rush closes the distance on the walk cycle, then the attack clip lands
the hit.

**Monsters are built the same way**, on a 36x36 grid: whole authored frames,
swapped rather than transformed. Six body plans — gaunt humanoid, bulk,
quadruped, floating, serpent and winged — carry eight heads, and every face is a
void with the eyes as the only light in it, exactly like the heroes. Horns,
crests, wings, ribcages, ember cracks, venom veins and a reaper's scythe hang
off those plans, so twenty-two creatures come out of one system and still read
as one bestiary. Their idle is the same light-carried breath, with a wing or a
crest settling on the exhale; attacks rear back and throw forward over two
frames.

Boss palettes were written for a brighter game, so anything merged into a sheet
gets tone-mapped rather than uniformly darkened: a bright colour is pulled hard
toward the dungeon's night while a dark one barely moves, and the glow keys are
left alone entirely. A boss also gains a broken gold circlet, placed from the
measured top of its own silhouette.

## The dungeon behind them

The backdrop is a 200x96 pixel scene, not vector art, and it is lit the way a
dungeon should be: **two torches against the dark**. Every colour is a mix
between a cold near-black and the region's own stone, and the only thing that
pulls a surface out of that black is how close it sits to a flame — so shadows
go blue, the lit middle goes warm, and the corners simply go.

Torchlit masonry picks each brick's value from the falloff of the two sconces;
the floor is laid out on a one-point perspective with its joints walked line by
line so a receding seam stays an unbroken stroke; buttresses frame the shot
under a stalactite ceiling and a cornice.

At the vanishing point is a **stairway down**, not a door — this is a dungeon,
you descend. Each tread behind the last is narrower and darker with its own lit
nose, so the flight drops away into black, and the landing spills three steps
out of the archway. The enemy stands on that landing: the way down is behind the
thing in your way, so killing it is what opens it, and the hero walks into it on
the walk cycle when the fight is won.

The flagstones are **littered with what the dungeon leaves behind** — a sword
driven into a crack, a split shield, a picked-clean ribcage, a burst crate, a
torn sack, pot shards, a coil of chain, a rusted cap, a fallen board and loose
bone. Nothing decorative for its own sake; it is the wreckage of whoever came
down these stairs first. Items further back are drawn smaller, and both
fighters' footing is left clear.

Every region then paints its own landmarks into the same pixels — bones and
corner webs in the crypt, algae and standing water in the grotto, lava seams in
the foundry, icicles and frost, vines and mushrooms, cracks and rubble, sky
breaches, burial niches, magma and banners. Only the torch flames and their
light pools animate on top.

Everything that has to stay visible lives inside x 44..156, because the panel
crops the scene to its own aspect — sides on a phone, top and bottom on a
desktop.

## Skill effects and the ultimate

**Every skill draws itself, and the hero poses to match it.** A skill names a
`pose`, a `kind` and a `hue`. The pose picks which of the hero's clips plays —
a swing, a **shield bash** where the shield leads and the sword stays down, a
straight **thrust**, an overhead **raise** for casts and calls, or a rising
**uppercut** — so Shield Bash uses the shield rather than the sword and Staff
Strike is a melee blow rather than a spell. The kind is the effect on the
target, placed from its measured box so a slash lands on the enemy instead of
hanging in the air above it: crescent **slashes** (one to four, each at its own
angle), an impact **hit**, a thrown **bolt** with a trail, an expanding **nova**,
a **beam** dropped onto the target, ice or bone **shards** driven up out of the
floor, a ground-shaking **quake**, and a **flurry** of rapid sparks, over eight
hues. Anything that heals, drains or costs blood also flares on the caster, and
a skill that only charges you goes off where you are standing rather than across
the room.

Every weapon travels through every attack clip, on all five classes. The mace
and the staff used to be held at head height in all three attack frames — the
cleric's *Mace Swing* never brought the mace anywhere near the thing it was
swinging at — and both now haul back behind the shoulder, come down and forward
into the target, and end low and out. The warrior carried his sword as a two
pixel strip of steel flush against his own steel armour, so he read as
empty-handed at rest; he now carries it out clear of the body where you can see
it. **Thrust** and **uppercut** used to begin with the weapon at rest or already
out in front, so it teleported on frame two; both now coil first. And a shield
driven forward is drawn in front of the man driving it rather than behind him —
the middle frame of Shield Bash, the one frame where the shield is supposed to
be hitting something, used to have no shield in it at all.

**Both hands work.** The rogue carried two knives and only ever swung one of
them — the off-hand sat where it was through the wind-up, the stab and the
overhead, and on the follow-through it was not drawn at all. It now runs the
opposite half of every motion: back when the lead hand goes out, forward as it
recovers, both points driven through on a thrust. The brawler, whose entire
class is his hands, threw one fist and left the other hanging; now one leads and
the other is chambered at the jaw or loading for the next one. And the warrior's
shield, which used to hang at rest through every clip except the bash, now
counterbalances the sword — hauled back as the blade rears, brought across as it
lands, dropped low on the follow-through.

**How each class waits** is its own now. The rogue holds both blades across the
chest on the diagonal, points up and out, instead of standing them upright at
his sides. The brawler waits in a Kazama-style karate
stance rather than a boxer's double guard: lead arm out at the enemy and
dropping as it goes, rear fist cocked high by the shoulder, head carried a pixel
forward over the lead foot. The two hands sit on a diagonal, and the long lead
arm is the whole silhouette. His eyes are a pure red coal with no white core —
he is the only one lit that way. His guard is drawn as two whole limbs rather
than assembled from the shared arm parts, which are two pixels wide and hinge in
the wrong place for a raised hand; sharing them left him with one thin arm and
one that looked broken. His elbows fold at the ribs, not at the hip.

**Everyone looks at the enemy.** Every head was built on the same mirrored pair
of eyes — glow, core, void, void, core, glow — and a symmetric pair reads as
looking straight out of the screen no matter what you do with the rest of the
skull. The pair is now carried forward into the face opening, the brow clips the
far eye down to a single pixel, and the near eye keeps the hot core, so the far
one is half the size and dimmer. That asymmetry is the whole three-quarter turn,
and it applies to all five: helm, hood, cowl, wrap and mask.

**Every skill is a movement before it is a number.** All forty of them name one
of nine movements, and the movement is measured against where the enemy actually
is on screen, so the same skill reads right on a phone and on a desktop:

| movement | what it looks like | who uses it |
|---|---|---|
| **step** | a pace in, the blow, a pace back — heavy cuts rear back first | Slash, Cleave, Staff Strike, Poisoned Blade, Mace Swing, Jab |
| **lunge** | coil, then spear the point out and snap back | Quick Stab, Venom Fang, Molten Bite |
| **charge** | shoulder, shield or palm first; the hard stop *is* the hit | Shield Bash, Guardian's Wrath, Iron Palm, Dark Pact |
| **barrage** | several blows, a pace of ground taken on every one | Rampage, One-Two, Hundred Fists, Dragon Fist |
| **through** | a pass straight through it, the cut landing as you cross, then gone | Arcane Blade, Gale Slash |
| **leap** | up, across and down on top of it | Heavy Strike, Uppercut, Stone Fist |
| **behind** | out in a puff, in past the far shoulder, turned around | Backstab, Shadowstep, Execute, Smoke Bomb |
| **plant** | rooted: the cast gathers into the floor and shoves the caster back | Fireball, Meteor, Lightning Strike, Bone Shard, Frost Nova |
| **invoke** | rooted: arms up, a column of light, nobody moves | Smite, Consecrate, Holy Nova, Benediction, Arcane Focus, Preparation, Soul Drain |

Every movement drives one transform, so no two of them fight over the sprite,
and the timing lives in the code rather than in a keyframe — which is what lets
the hit land *while* the hero is in contact rather than after it has recovered.
A skill always ends standing exactly where it started; even a thrown error puts
it back. Every swing also drags an arc of light behind the blade.

**An ultimate charges before it lands.** The scene drops into darkness, motes
drag in out of the dark toward the hero, an aura winds inward, a pillar of light
stands up underneath them and the skill's name punches in while the sprite
rim-lights and trembles. Then the charge breaks on a white flash and the skill
itself runs — the same effect it always has, at its big size. No cutaway and no
versus panel: the release runs straight into the attack.

## Main menu

- **Play** — opens the **realm picker**: one card per subject, plus **Infinity**.
  Enter a realm and you get its hub — Enter Dungeon, Inventory, Craft, Index,
  Gem Shop, and (once you've beaten a 10th-floor boss at least once) **Boss
  Rush**, which lets you refight any boss you've cleared as many times as you
  like to farm cores and artifacts.
- **Study** — Subjects, Notes, Upload to AI, Flashcards, Quiz Practice, AI Settings.
- **Characters** — pick a class and build its skill tree (for the realm you're in).

## Realms — one dungeon per subject

Every subject is its own separate dungeon world. Your **character, levels, skill
tree, gear, gold, gems, cores, materials and blueprints all belong to the realm
you earned them in** — a level-40 Warrior in Mathematics walks into Science as a
level-1 nobody with nothing. Switch realms any time from **Play**; each realm
keeps its own run in progress.

- **Subject realms** — one per subject. Questions come from that subject only.
  **Mathematics** ships built in and drills the **multiplication tables**;
  upload your own files to a subject and its flashcards become its questions.
- **Infinity** — every subject shuffled together, every note you have ever
  uploaded, all in one dungeon. Its gear is its own too: nothing you earned in
  a subject comes with you.
- **The Index is the one thing that carries everywhere.** Every weapon, armor
  piece, artifact and monster you have ever discovered, in any realm, stays
  discovered in all of them — so you always walk in knowing what's coming.

Add, rename and delete subjects in the **Study** tab; a new subject immediately
becomes a new realm. Deleting a subject deletes its realm (the Index survives).

## Damage types, weakness and speed

**Every skill deals one type of damage and every creature has a body.** The
rule is two lines long: hit something it is weak to and the blow lands for
**×1.5**; hit something it resists and it lands for **half**. Nothing else. A
fireball thrown at something that only fears lightning does ordinary damage —
being an ultimate does not make it the right tool.

The eight types are Physical, Holy, Fire, Lightning, Frost, Poison, Bleed and
Shadow. What a thing is made of decides most of its table — undead fear Holy
and have nothing to poison, constructs fear Lightning and cannot be made to
bleed, beasts open up to Fire and Bleed — and a species overrides the rest.
A drowned husk is a skeleton that has been in the water long enough to conduct.

**Poison and bleed stack.** Up to three wounds sit on an enemy at once, each
ticking for three rounds, and how well they take depends on the body: some
things take them badly (×1.5), some barely hold them (×0.5), and a wraith or a
golem cannot be made to bleed at all. Execute detonates every open stack at
once.

**Speed decides who swings first.** Every class and every monster has it. If
the thing across the room is faster than you it opens the floor — **IT MOVES
FIRST** lands across the scene, and it crosses the room and hits you before you
have answered a single question. No answer stops it. A warrior in no boots gets
opened on 81% of floors; a rogue on 7%. Rogue is
the quickest by a distance, then the brawler, then the mage, the cleric, and
the warrior last, because he is carrying most of a forge. **Boots** are their
own armour slot and the only gear in the game that moves Speed — they carry
armour too — so a light pair against a heavy one is a real decision. There are
four slots and **greaves are not one of them**: helm, plate, **gauntlets** and
boots. Greaves were a second breastplate with a different name; gauntlets are
the piece that means something to someone who swings for a living. An old save
carrying greaves has them moved across to the gauntlet slot on load rather than
orphaned in the backpack.

Stuns and paralysis are the same thing wearing two names: the enemy loses its
next turn outright, and its charge does not build while it stands there.

**Armour can take most of a hit, never nearly all of it.** Defense is flat
subtraction, which is readable — *it ate 46 of your swing* — but flat
subtraction against a stat that grows with the floor while your attack flattens
out at level 40 and legendary gear has exactly one ending. Measured across
floors 10 to 90 at level-appropriate gear, armour was eating **87%** of every
basic swing by floor 90, damage per turn was *falling* from floor 70 to floor
90 while monster health kept climbing, and a cleric needed 36 turns to finish a
floor it cleared in 11 at floor 10. The subtraction stays; it is now capped at
**60% of the swing**. Piercing comes off before the cap, so the brawler is
still the answer to a plated thing — just no longer the only one.

**The arithmetic is on the button, and the number on it is the number you
deal.** Every skill prints the whole chain that produces its figure:

`27 base → Benediction +30% → −5 its defense → Easy question ×0.75 → WEAK to Holy ×1.5 → Bone Armor ×0.54 → ~19`

The base is what the skill is worth with **no buff running**, so it holds still
while the headline number moves when a buff goes up and drops back when it
expires. Everything that takes damage *away* is in the chain too — the enemy's
defense, an easy question, a boss ability that is mitigating right now — because
a hidden reducer sitting under a visible bonus is precisely what makes a working
bonus look broken. Buffs, Might, weakness and resistance, Venomcraft stacks,
Momentum, Combo, Bulwark and guaranteed crits all appear.

The chain walks the engine step for step, in its order and with its rounding, so
it is a prediction rather than an estimate: 96 button-vs-dealt comparisons across
five classes, ordinary floors and bosses, easy and hard questions, buffed and
unbuffed, all match exactly.

**Training is a drill, not a transformation.** Between boss floors you can
train for a small permanent gain — +4% Attack, +6% Defense, +4% Max HP or +3%
Crit — and drilling the same one twice adds up and shows as `×2` rather than
silently stacking a second identical tag. It used to hand out **+25% Attack or
+35% Defense in one go**, at every one of the ten checkpoints, and because the
buffs were concatenated rather than merged, ten drills was **+250% Attack**
permanently for clicking the middle button. Ten drills now come to roughly
+10% Attack, +13% Defense, +12% Max HP and +6 Crit across a whole run.

A charge buff lasts **5 turns**, which is deliberately one turn longer than it
takes to bank the 5 energy an ultimate costs. At three turns it was arithmetically
impossible to ever have one up when you cast an ultimate.

**The `!` over the enemy's shoulder** opens the floor's intel card: what the
thing is, its family, its HP, attack, defense and Speed against yours, what it
is weak to, what it resists, whether wounds take hold on it at all, **what
armour it is wearing and what it knows how to do**. The
skill buttons carry the same knowledge — each shows its damage type, and a
`WEAK ×1.5` or `RESISTED ½` flag against the thing you are actually fighting,
with the damage estimate already adjusted.

## Testing it without playing it

`index-test.html` is the same game with a cheat panel bolted on, generated by
`tools/maketest.py`. Open it instead of `index.html` and there is a pink bar
across the top, a marked tab title, and a panel bottom-right:

- **Instant kill** (or press **K**) — drops the thing in front of you and runs
  the *real* victory path, so XP, loot, the floor counter and the boss-cleared
  list all behave exactly as they would have.
- **Jump to any floor** — type a number, press Go. Starts a run if you are not
  in one.
- **God mode** (or press **G**) — damage still lands and still shows, you
  simply do not die. It wraps `handleDeath`, so poison, a boss ultimate and a
  party wipe are all covered.
- **Always correct** (or press **A**) — whatever option you click is submitted
  as the right one, so you can drive a fight at speed without reading a
  question. It goes through the real `submitAnswer`, so energy, combo, mastery
  and XP all still happen.
- **Skip to next boss floor** (or press **B**) — the next floor ending in a
  zero, capped at 100.
- **Heal party + energy**, **+10 levels and spend them**, **full legendary for
  everyone**, **gold/gems/materials** — enough to get a build together in four
  clicks instead of four hours.
- **Force an omen** and **Make it a Nemesis** — the two rare things, on demand,
  rather than waiting on a 1-in-11 and a 1-in-25.

The whole suite lives in `tools/tests/` and runs with one command:

```
bash tools/check.sh              # everything
bash tools/check.sh study ai     # just those
```

**The runner is written not to lie.** The ad-hoc version of it grepped each
test's output for `problems:` or `failures:` — which most of them print, but
`hunt.js` reports its failures as plain sentences. So when the offline
generator started returning *zero* flashcards, the sweep printed `hunt ok` and
the bug went in. `check.sh` matches every shape a failure takes in these files,
strips the sandbox's blocked-CDN noise first so it cannot be mistaken for one,
and — the part that matters — treats a test it **cannot classify** as a failure
rather than a pass. Silence is what bit.

Two tests had to be fixed rather than accommodated: `boot.js` printed a list of
console lines and stopped, and `feet.js` printed its measurements without ever
saying whether they were acceptable. Both now state a verdict and exit non-zero
on a real problem, because a test that will not tell you whether it passed is
the problem.

Two more harnesses answer the questions playing cannot:

- `soak.js` — plays all five classes from floor 1 to 100 with the animations
  off, answering correctly 75% of the time, and reports turns per floor by
  band, deaths, level reached and where each class stalled. Ground truth: it
  makes the real calls, picks real skills and takes real damage.
- `balance.js` — a static probe at floors 10/30/50/70/90 with the gear each
  floor would plausibly have handed over: damage per turn, turns to kill, and
  how much of a swing the monster's armour actually eats.

`balance.js` summed direct hits only and **never counted damage over time**,
which reported the rogue — whose entire kit is open wounds — at a fraction of
its real output, and nearly got it buffed on the strength of a measurement
error. It counts stack payloads now, capped the way the game caps them.
- **Wipe this test save** — starts the test build over. It cannot touch
  anything else.

**It cannot reach your real save.** Every storage key is prefixed `sdtest_`,
on both the localStorage path and the host-store path, so the test build reads
and writes its own profiles, its own realms and its own Index. That is checked
rather than asserted: `testbuild.js` plays the real build, leaves a save,
plays the test build hard, and then reopens the real one to confirm its realm
is still there, the test realm never leaked in, and the cheat panel does not
exist in it.

Regenerate it after any change to the game with `python3 tools/maketest.py`.

## The last one

He is built on the **hero rig**, not the creature one. Every other monster in
the game is a body plan with a head dropped on it and whatever shading the
silhouette implies, which is the right tool for a slug and the wrong one for
the last thing you fight — he is a man, he is your size, and he is on screen
longer than anything else in the game. So he is made the way the five playable
classes are made: a 32×32 sheet with a real face, layered arms, a coat that
moves on its own frames and a cloak, twenty-one frames a phase.

The lesson took four passes, and each one found a different reason the same
sprite was unreadable:

1. **Detail is not shape.** At 32×32 a character reads as a set of *distinct
   shapes* you can name at a glance — the warrior is a horned helm, a gold
   band, two eye slits, a shield and a sword. The first Malakor was a flat
   white wedge with two red bars across it, which reads as a visor.
2. **Value, not hue.** The second one had a face, and still vanished: his coat,
   his arms, his cloak and his outline were five tones inside three shades of
   black, so there was nothing for the eye to separate. The coat ramp was pulled
   apart until the collar, the sleeve seams and the folds each land on a
   different rung.
3. **Proportion.** The rig is a big-headed body with shoulders seventeen pixels
   across. The warrior gets away with it because his outline is cluttered with
   gear; Malakor had a narrow skull over two flat black slabs and read as a man
   sitting in an armchair. The skull was widened to the same span as the other
   classes and the sleeves given a lit outer seam so they read as arms.
4. **He was carrying nothing.** Every other figure in the game holds something
   that breaks its outline. So: **one horn**, full length, three pixels at the
   root and one at the tip, lit down its leading edge and sweeping up off his
   temple — and three **pieces of the tower**, turning in the air at his open
   hand. He carries no weapon because he does not need one; the building you
   are standing in is the weapon, and it is listening to him.

Both of those last two are drawn straight into the 32×32 grid rather than into
the rig's part boxes, which is the only way anything gets to run outside them.

**He has two phases.** At half health the seals the four sages left on him give
out: the screen inverts, he says *"Ah. There it goes."*, the sheet swaps under
the flash so the change is never seen happening, and he comes back with +35%
attack, more speed, better judgement and the room permanently his colour. He
does not grow — he is the same man standing in the same place, and the light he
has been holding in for a thousand years simply stops being held. Since he
cannot be big, he is present instead: something under him that is not light,
and embers coming off him the room does not have.

**He does not fall over and let you walk past him.** Beating him doesn't cut to
a victory card: the camera goes in on him, he stays on his feet, and he talks —
*"A thousand years, and it is a student who does it. Then let me tell you what
you have killed."* — and that turns into the flashback. The panels play, and
then he is back on screen one last time for **"At last. I am free."** before the
light takes him.


Every other boss down there is enormous. He is exactly your size, because the
oldest and worst thing in the tower turning out to be a slim, well-dressed man
who is delighted you came is the entire idea of him: black tailcoat with a red
lining and a gold sash, white hair swept over one side, one eye that glows, a
small amused mouth, and **one horn** — he was never born a demon and the
missing second one is how you are supposed to know.

He speaks before you are allowed to see him. Three lines out of a black room,
then the reveal, then *"Shall we begin."* When he moves, the tower moves with
him: the scene shears and inverts and his old seals tear up out of the floor.
He is also the one thing down there that wears no armour — the gear system had
been dressing the demon who commands the tower in looted scrap. And he does not
roar, brace or lunge like the rest of them; his skill lines are his own (*he
smiles, and it reaches his eye*).

Beating him plays his story rather than cutting to a victory card: **twenty-three
panels**, each an illustration on the same pixel grid as the rest of the game,
with the text under it. Nobody speaks. You read it at your own pace, click or
space, over a score the browser plays itself.

**The people the story is about.** Sarah, Bruno and the four sages were grey
silhouettes — a tapering bar with a head on it — on the grounds that at 160×90
a person is twelve pixels and a face is four. That holds for a crowd. It does
not hold for the wife and the child the king puts in front of him, or for the
four friends who put him under a hundred floors, because they are the reason
any of it lands. All six now have sheets of their own on the same rig as
everyone else: auburn hair and a plum dress, a child three rows shorter in his
own box, and an order of four in blue, green, gold and violet under pointed
hats, each with a staff whose light meets the other three over his head. You
see their faces when the swords come out.

At the very end you see them once more, and there they are deliberately almost
gone: the same two sprites, so you know exactly who is standing there, washed
down to a stain of colour with no contact shadow under them and a slow fade in
and out over six seconds. They are not in the room with him. They are a glimpse
through the eyes of a man who is closing them, and a solid pair of people
standing on a floor is the wrong picture for that.

They only ever stand still in a panel, so the nine cutscene-only sheets ship
their idle frames and nothing else — `heroSprite` already falls back to idle
for any clip it cannot find. Six new characters, and the sprite data got
*smaller*.

**He is human until they shut the door on him.** The change happens in the
dark, under a hundred floors, after the sealing — so he is the young man in
steel blue right through the crowd backing away from him, the four sages
closing the ring, and the tower coming down on his shoulders. Only *"and in
the dark, with all of that strength and nowhere to put it, I became something
primordial"* shows the thing you fought, and it arrives at the form you fight,
not the phase-two one, which is a thousand years further on and only happens
when the seals give out mid-battle. That panel also puts the burst *around*
him and leaves him a hole of black to stand in — the line says "in the dark",
and he is the only dark thing in the game.

Two panels were also illustrating the wrong line. **"Their heads rolled down to
my knees"** had a burning city under it, which happens nowhere in this story.
It is now the same hall you just saw them standing in, drained to black, two
swords put down in the floor, and nobody between them.

For two panels the man in the flashback was the **player's warrior sprite** —
which reads as your character wandering into somebody else's memory. It is not
your story, it is his, so the young hero is built on Malakor's own rig, part
for part: same skull, same coat, same white hair, in steel blue and gold with
warm skin, a human eye and a sword in it. No horn — the whole point of the
sequence is watching where the horn comes from. The king had the same fault for
the same reason (the warrior's rig under a purple ramp, so the man on the
throne was wearing your helmet) and now has a head of his own: a crown, a face
under it, and none of your gear.

The panels went through the same correction the sprite did. The first set was
silhouettes on banded gradients, and you could not tell a throne room from a
forest — the fix was not more animation, it was **building things that are
recognisably things**, and then standing the game's own sprites in them: a
street hung with banners and lined with people, a throne with steps up to it
and a gilded fan behind it, three swords hanging point-down over two people on
their knees, a city skyline on fire, a lit doorway with a hooded figure against
it, four sages with their beams meeting on him, the tower coming down on his
shoulders. A crowd is two ranks — small heads at the horizon and big ones at
the bottom edge where the frame cuts them off — and every person in it has two
pixels of daylight at the neck, which is the whole difference between a post
and a man. Every layer still moves on its own timing, so the rays turn while
the ground holds and the smoke keeps climbing after the flash.

## The rooms are not empty

A room that only moves when the two fighters move is a painted backdrop, not a
place. Every room carries a thin layer of small animals over the pixel art:

- **The dungeon** — bats crossing under the ceiling, a rat that bolts along the
  wall line and stops dead before bolting again, moths circling the torchlight,
  dust in the air, water dripping off the vault.
- **Venomwood** — birds crossing the canopy, butterflies in the clearing,
  leaves coming down and turning as they fall, fireflies low in the grass.
- **Shattered Ruins** — birds over the plaza, seeds drifting, dust.
- **Storm Spire** — nothing lives up there; the weather does. Debris is thrown
  sideways across the whole frame and tumbles as it goes.
- **Shadow Catacombs** — bats, drifting mist, and lights low over the graves.
- **Obsidian Depths** — embers coming up off the cracks, ash coming down.
- **Hollow Sanctum** — stars that come and go, and sparks rising off the disc.

Each layer is built **once per room and then re-parented**, never rebuilt —
moving a live node does not restart a CSS animation but making a new one does,
and a bat that teleports back to the wall every time you answer a question is
worse than no bat. Layout is deterministic noise, so a room is laid out the
same way every time you stand in it. Sizes are in per cent of the room's own
200-pixel grid rather than screen pixels, so a nine-pixel bat is 4.5% wide and
stays the right size at any panel width. Reduced-motion turns the whole layer off.

**The torches are fire now.** They used to be three stacked rectangles with
`scale(.9, 1.14)` pulsing on them, which does not read as a flame — it reads as
a small person breathing. Fire does not scale, it changes shape, so the torch
is authored the way everything else that moves in this game is: six whole
7×9 frames swapped in sequence. The tongue leans, a tip tears loose, and
embers come off the top on their own slower loops.

**Study and Characters come off the bar during a run.** While a floor is live
the only way out of a fight is through it or by fleeing — not by wandering off
to reshuffle a skill tree mid-swing. The bar says which floor you are on
instead. The inventory and the Index are still reachable from inside the run.

## Three go down, not one

The last screen before the stairs asks **who goes down**. You pick up to three
of the five, and the first one picked leads.

Only the hero in front can be reached. **Each carries their own health**, and
the bench is safe but it is not a hospital — nobody heals back there. Bringing
someone forward **costs you the turn**: you do not answer anything, and the
monster gets a free swing at whoever just stepped up. That is the whole
tension. Swapping the warrior in to eat a charged attack is a real decision
because the swap itself is what you are paying, and swapping out a hero on 4 HP
means fighting the rest of the floor two-handed.

When the hero in front hits zero they go down rather than ending the run —
whoever is next drags them clear and picks up the fight. They are back on their
feet on the next floor at **35%**. The run only ends when all three are down.
Resting and making camp reach the bench too.

**Equipment does not follow anybody**, which is what makes the choice bite: a
legendary dagger in your backpack is worth nothing unless the rogue is one of
the three.

### What each one is bad at

A class with only strengths is a class you never swap out. Three of these are
weaknesses the classes already had and were never told about; two are new, and
both are real code rather than flavour text:

| Class | Weakness | |
|---|---|---|
| Warrior | **Ponderous** | Slowest thing in the party. On most floors the monster swings before you are asked anything. |
| Mage | **Fragile** | Takes **25% more** damage from physical attacks, on top of the thinnest health in the game. |
| Rogue | **Patient** | Deals **25% less** until a wound is open — and against anything immune to poison and bleed, that is the whole fight. |
| Cleric | **Merciful** | The lowest attack in the party, and every skill it has is Holy, so anything that resists Holy halves all of it at once. |
| Brawler | **Earthbound** | Momentum pays nothing against anything faster than him, and he has no ranged answer when that happens. |

Both new ones are in the damage chain on the button like everything else — a
rogue with nothing bleeding reads `… → No wound open ×0.75 → …`, so the
penalty is visible rather than a number that quietly fails to show up.

## What sometimes happens

By floor thirty the shape of a floor is known, and knowing it is fine — it is
the game. But ninety floors of exactly that has nothing to tell you afterwards.
So from floor 31 two things are allowed to happen that usually do not.

**An OMEN** lands on the floor and changes its rules for as long as you are
standing there. It gets a card on the way in, a chip in the header and a line
in the `!` panel. Roughly one floor in eleven from 31, one in eight from 61:

- 🌕 **Blood Moon** — it hits 45% harder, and everything it carries is worth half again.
- 🎒 **Grave Cache** — you start at full Energy behind a 35% shield.
- 🕯 **Thin Veil** (41+) — every blow lands 30% harder. Yours and its.
- ⚡ **Quickening** (41+) — you draw one extra Energy every turn.
- ✨ **Witchlight** (61+) — +25% critical chance for the whole floor.
- 👁 **The Watcher** (61+) — it acts twice as often as it should, and it is already braced.

**A NEMESIS** is not a rule change; it is a specific monster that should not be
on this floor. From floor 56, about one floor in twenty-five: the species takes
a title — *Hellhound, the Quiet Ruin* — and arrives with 2.3× health, all four
pieces of armour, the full kit, perfect judgement about when to use it, and a
guaranteed item. It wears the boss treatment so you can see it coming.

Both are rare on purpose. An event that fires every third floor is a mechanic;
one that fires every eleventh is a story.

## What the depths learn

A floor-90 grunt used to be a floor-3 grunt with bigger numbers, which is the
one thing a hundred-floor dungeon cannot afford — the fight stops being a fight
and becomes arithmetic. So the things down there do what you do.

**They put armour on.** From floor 18 a monster is wearing a helm; a piece is
added roughly every 22 floors after that, up to four, and bosses and elites get
one extra. Each piece is a real stat — the helm is +22% defense, the plate is
+34% and +12% HP, the bracers are +14% attack, the greaves are +16% Speed and
+12% defense — and each is a real band of steel drawn onto the sprite. The
banding is applied to the frame itself, repainting only pixels that were
already filled, so it works on a skeleton, a slug and a dragon alike, tracks
every frame of every animation, and never changes the silhouette. It also skips
anything held out to the side, so a reaper's staff does not come back plated.

**They stop only swinging.** From floor 12 a monster has a kit, drawn from its
role: brutes wind up and rally, casters pick your armour apart, swift things
open you up and go for your hands. Seven of them —

- **Brace** — it sets itself; your next hit lands at half.
- **Rally** — +35% attack for three turns.
- **Mend** — takes 18% of its health back, once, and only when it is hurt.
- **Disrupt** — two Energy gone.
- **Sunder** — your defense down 28% for three turns.
- **Rend** — it opens you up and you bleed for three.
- **Crush** — it winds all the way back: a 1.75× hit.

**And they get better at picking.** Two curves run off depth alone, so both are
legible from the floor number: how often it spends a turn on something cleverer
than a hit (14% at floor 12, 50% at floor 100) and how well it chooses once it
has decided to (20% to 100%). A shallow monster that rolls a skill picks at
random. A deep one reads the board first — it mends when it is dying, it braces
when you have a buff up, and it drains your Energy precisely when you are one
point away from an ultimate. That last one is the whole idea: it has watched
people get stronger and it knows what they are saving for.

Both Brace and a Freeze are in the damage chain on the button like everything
else, so the number you are promised is still the number you deal.

## Where you fight

The first forty floors are a dungeon and look like one: running-bond masonry,
a voussoir arch with a stairwell dropping away behind it, flagstones on a
one-point perspective and two sconces doing all the lighting. Every ten floors
a region paints its own landmarks straight into that stone — bones and webs,
algae, lava cracks, icicles, vines.

**From floor 41 you are not in it any more.** The room changes every ten
floors and stops being a room:

| Floors | Where | What is in it |
|---|---|---|
| 41–50 | **Venomwood Thicket** | Open wood in full daylight. A lumpy canopy, two great trunks framing the shot, shafts of sun coming down through the gaps, ferns, and the columns of a city sinking into the green. The brightest place in the game — and where the minotaur lives. |
| 51–60 | **Shattered Ruins** | An open plaza at the end of the day. A standing colonnade with most of it gone, the drums of the ones that fell, grass coming up through the flags, and a broken gate arch with the sun sitting behind it. |
| 61–70 | **Storm Spire** | The top of something very tall, in weather. Cloud banks lit from inside, forked lightning, a parapet with merlons knocked out of it, a span running on into the cloud, and rain coming in sideways. |
| 71–80 | **Shadow Catacombs** | The graves are outside. A moon with a ring round it, a mausoleum on the skyline, ranks of leaning headstones, dead trees, low banks of mist and two wisps that are not lanterns. |
| 81–90 | **Obsidian Depths** | A caldera. Ash rolling over the top, the lava lake showing through the crater wall, obsidian spires leaning off the rim, basalt cracked and glowing through, embers going up. The dragon lives here. |
| 91–100 | **Hollow Sanctum** | No room at all. A stone disc hanging in a starfield with nothing underneath it, broken rings of script standing on it, two pillars that do not reach anything. |

They are built on the same 200×96 grid and the same palette keys as the
dungeon — `a`–`e` back, `f`–`i` ground, `l`/`n`/`o` dressed stone, `t`/`u`
tint, `v`/`x` glow — so every effect layered over the scene keeps working
without knowing which room it is in: the boss entrance still dims it and zooms
its camera into the spawn point, the ultimate cinematic still blacks it out,
the evolution flash still fires. The lighting does change: outside there are no
sconces on a wall, so the torch flames and their pools come off with the
stonework and the vignette eases, except in the necropolis, the caldera and the
void, which are outside but are not bright.

Nothing in any of them is random at draw time — it is all deterministic noise —
so a room never flickers between frames or between renders.

## What you fight

**Floors are grouped into five twenty-floor bands, and each band fields six
species of its own.** The thing in front of you changes every floor instead of
being the same skeleton for ten of them — floors 1 to 9 now cycle a Zombie
Corpse, a Giant Centipede, a Skeleton Footsoldier, a Goblin Scavenger, a Cave
Bat and a Dire Rat, and no two floors in a row field the same creature.

| band | floors | what lives there |
|---|---|---|
| **The Sunken Cellars** | 1–20 | Dire Rat, Cave Bat, Goblin Scavenger, Skeleton Footsoldier, Giant Centipede, Zombie Corpse |
| **The Fungal Caverns** | 21–40 | Violet Fungus, Gelatinous Cube, Goblin Shaman, Cave Fisher, Rust Monster, Harpy Seducer |
| **The Sunken City** | 41–60 | Minotaur Berserker, Gargoyle Sentinel, Orc Warlord, Basilisk, Mimic Chest, Shadow Stalker |
| **The Infernal Depths** | 61–80 | Hellhound, Fire Elemental, Succubus, Chimera, Iron Golem, Wyvern |
| **The Abyssal Void** | 81–100 | Lich King, Beholder, Mind Flayer, Death Knight, Void Stalker, Ancient Red Dragon |

Every species carries a **role** that changes how the fight actually goes:

- **Soldier** — fights straight.
- **Brute** — 50% more HP and heavier armour, but winds up a turn slower.
- **Swift** — frail, and charges its heavy hit an entire turn sooner.
- **Caster** — 40% more attack off 78% of the HP. Hits hard, folds fast.
- **Plated** — 85% more defense. Nothing dents it that does not pierce.
- **Swarm** — weak and constant, always charging.

The role rides on the nameplate, so a Plated one is never a surprise, and two
species built on the same sprite are tinted apart. Each one also carries its own
family, weaknesses and resistances — a Gelatinous Cube shrugs off physical and
poison and cannot be made to bleed at all; a Fire Elemental only fears frost.

**Floors ending in 5 field an elite** of whatever is due there — crowned, 40%
more HP, 20% more attack, and named for it. Every 10th floor is a **unique
boss**. Thirty species and eleven bosses all have their own Bestiary entry.

## How a monster attacks

The heroes stopped teleporting at things a while ago; the monsters were still
doing it, sliding sideways on one shared keyframe whatever they happened to be.
Each one now crosses the room the way its body suggests, plays its own attack
frames, and lands a real impact on you:

| move | what it does | who |
|---|---|---|
| **pounce** | coils, then crosses the whole gap in one | Swift and Swarm |
| **slam** | a long haul back, then all of it at once, and the room shakes | Brute and Plated |
| **hurl** | rocks back and throws — it never closes at all | every Caster, wings or not |
| **swoop** | up over the room and down on top of you | anything winged |
| **maul** | steps in and swings | everything else, and bosses |

A charged attack gathers first — the telegraph — and then does the same thing
harder. Bosses move at their own scale.

**And they animate like the heroes do now.** Every creature used to attack in
two frames that shared the same arm and leg pose three pixels apart — a monster
sliding rather than swinging, the exact problem the heroes' weapons had. Each
one now has a limb cocked back and a limb swung through: **gather** low with the
claws drawn up beside the shoulders, **strike** forward off splayed legs with
the core lit, **follow** through low and heavy. Its idle breathes over six
frames with a real settle — the body drops a pixel and the silhouette widens on
the compressed one — instead of only puffing its chest over three. And there is
a **travel pair** at last, played while it crosses the room, because these
things move now and were doing it rigid. Six frames per creature became eleven.

## Boss ultimates

**A boss is counting your mistakes.** Every wrong answer winds it one notch, and
at **five** it stops trading blows and does the thing it has been building to.
The meter sits under its health bar naming the attack, so the fifth mistake is
never a surprise — it is a deadline you watched approach. Each of the ten has
its own: Grave Tide, Full Constriction, Core Breach, Absolute Zero, Broodswarm,
Seismic Ruin, Eye of the Storm, Harvest, Infernal Cascade, Unwrite — hitting
roughly two to four times a normal blow, and each carrying its own rider: a
burn, an energy drain, a freeze, sealed hints, or the boss healing itself.

**And a boss floor no longer feels like the nine before it.** The room takes the
boss's own colour as an aura, breathing slowly at the edges, with embers
drifting up through it.

## Boss entrances

**A boss is not simply standing there when you walk in.** Each of the ten
arrives the way its own description says it should, as a short cutscene before
anybody swings: the room darkens, a line lands at the top, the camera pushes in,
and something happens.

| floor | boss | how it arrives |
|---|---|---|
| 10 | Crypt Warden | the floor splits and it climbs up out of the ground, a piece at a time |
| 20 | Grotto Serpent | the water moves, and coils slide past before the head does |
| 30 | Foundry Golem | sparks rise off the forge and plates slam together upward |
| 40 | Rime Wraith | frost sweeps the room and ice drives up out of the flagstones |
| 50 | Thicket Matriarch | threads drop from a ceiling that is closer than it was |
| 60 | Ruin Colossus | the rubble goes back where it came from, block by block |
| 70 | Thunder Roc | lightning, twice, then pinions falling through it |
| 80 | Duskbound Reaper | the torches go out, and the scythe exists before the rest of it |
| 90 | Flame Dragon | the floor cracks and fire comes up through it |
| 100 | Malakor | the writing peels off the walls and spirals into the dark |

The camera aims at the **spawn point**, measured off the monster's own sprite
rather than a guessed coordinate, and the reveal suits the thing arriving: the
Warden and the Dragon **climb up out of the floor**, clearing the ground a piece
at a time with the dirt flying, while others **drop** from above, **fade** in, or
**assemble** upward.

Every entrance is written as a list of **beats** — `dark`, `zoom`, `crack`,
`prop`, `motes`, `sweep`, `flash`, `shake`, `hold`, `reveal` — so a boss is data
and the player is one function. Nothing about the boss is on screen until it is:
its name, health bar and ability card are all held back until the reveal, which
is the point of the thing. Boss Rush skips them, because a replay is not an
arrival.

## Evolution

**A cornered thing occasionally stops being what it was.** Once a monster is
under **30% health** there is a **5% chance per hit** that it comes apart and
puts itself back together **bigger**. It takes **half its health bar back**,
hits 45% harder, armours up, moves faster, gains a charge slot, and stands
**35% larger on the floor**. Every wound you had open on it closes over.

It is the **same creature** — it does not turn into a different one. An earlier
version had a skeleton come back wearing the Warden's body and a hound come
back as a dragon, which reads as a *new monster arriving* rather than the one
you were fighting getting worse, and it threw away everything you had learned
about what was in front of you. Now a Basilisk becomes a **Greater Basilisk**:
same shape, more of it.

It also used to heal to **full on a pool 2.2× the size**, which meant you fought
seventy per cent of a monster and were handed two hundred and twenty per cent of
one — a 5% coin flip that undid the whole fight. Half a bar back on a pool 35%
bigger is a second wind, which is the thing worth having.

It only happens **once per fight** and **never to a boss** — a boss already has
a second phase of its own, and two comebacks in one fight is not a fight.

Dropping the shape-change had a consequence worth naming, and `crecoverage.js`
is the test that named it: three sprites — the **Overseer**, the **Tyrant** and
the **Devourer** — were only ever reachable *by evolving into them*. With the
morph gone they were three finished creatures nobody would ever see, so they
join the roster of the **Abyssal Void** as monsters in their own right. That
test counts how many of the sheet's sprites a full run can actually reach, and
it is the reason this did not quietly become dead art. It is
not subtle either: the room darkens, the creature burns white and collapses
inward while motes drag in around it, and what rises does so *into* its new
size rather than snapping to it. Its name and health bar lift over the top,
since a bigger sprite otherwise grows straight up through them.

## The Dungeon

- 100 floors across 10 themed regions. Every 10th floor is a **unique boss**
  with its own artwork, its own fight mechanic and its own signature drop:
  Crypt Warden (Bone Armor), Grotto Serpent (Constrict), Foundry Golem (Molten
  Core), Rime Wraith (Deep Freeze), Thicket Matriarch (Venom), Ruin Colossus
  (Stoneskin), Thunder Roc (Stormcall), Duskbound Reaper (Soul Harvest), the
  Flame Dragon (Infernal Breath) — and on floor 100 the final boss, **Malakor,
  the Unwritten**, a crowned bone tyrant who devours a memory every third turn
  (healing itself and sealing your hints) and breaks his bindings below half
  health. Each boss drops a relic you can find nowhere else (25% chance).
- **You gain +1 Energy every round, then choose your difficulty** — Easy,
  Medium or Hard — before the question is even drawn. The choice is a real
  gamble, not a label:

  | | Damage you deal | Damage you take | XP | Energy | Question |
  |---|---|---|---|---|---|
  | 🟢 **Easy** | ×0.75 | ×0.85 | ×0.7 | — | small numbers / cards you've mastered, **3 choices** |
  | 🟡 **Medium** | ×1.0 | ×1.0 | ×1.0 | — | the full tables / normal draw, **4 choices** |
  | 🔴 **Hard** | ×1.6 | ×1.35 | ×1.8 | **+1 ⚡** | big numbers, chained products, missing factors / your weakest cards — **type the answer, no options** |

  A correct **Hard** answer pays a bonus point of Energy on top of the round's
  +1, so taking the risky question is how you fund your ultimate. A wrong one
  pays nothing.

  In Mathematics that means Easy is `4 × 7`, Medium is the full tables plus
  missing-factor problems (`8 × ? = 56`), and Hard is `17 × 14`, `9 × 6 × 4`
  and `? × 13 = 195` typed from memory. In a subject built from your own files,
  difficulty picks *which* cards you face: Easy favours cards you've mastered,
  Hard drags up the ones you keep getting wrong and makes you type the answer.
- Flashcard questions are weighted toward cards you've gotten wrong or haven't
  reviewed recently — a lightweight spaced-repetition scheduler. A subject with
  no flashcards yet falls back to a built-in demo deck so it's playable at once.
- Correct answer → you attack. Wrong answer → the enemy attacks. Both the
  player and the monster have HP and Energy bars; a boss's HP bar is bigger
  and sits at the top-center of the screen. Monsters "charge up" an Energy
  bar of their own — if they're fully charged when they get to attack, that
  hit is amplified, so don't get complacent.
- Answer correctly and a battle menu opens with four moves — a free **basic
  attack**, two costed skills (2⚡ / 3⚡) and your class **ultimate** (5⚡) —
  plus **Inventory**, to drink a potion mid-fight. Skill books learned from
  monsters appear in the same menu. The damage estimates on each move already
  include the difficulty you picked.
- Attacks are animated per class and per skill (see **Skill effects** above),
  with hit-flash, impact bursts, screen shake and floating damage/heal numbers —
  and ultimates cut to their own split-screen cutscene.

## After every floor

Clear an ordinary floor and the stair down waits while you take **one** action —
or none at all:

- **🔎 Search the floor** — turn over the rubble. Most of the time you find
  potions, cores, crafting materials, gold or gems; about a quarter of the time
  it's empty. **Searching is also how the rare encounters find you**: the
  Mysterious Merchant (~10%), a golden chest (~3%), and the Dwarf's Trial
  (~6% from floor 6, and at most once in a run). Walk straight past and you
  never meet them.
- **🔥 Rest** — heal 18% of max HP and shake off poison and burning.
- **⤓ Straight down** — skip both and take the stairs.

## After every boss

Clearing a 10th-floor boss opens a bigger choice before the stair down:

- **Rest** — heal 45% of max HP and clear poison and burning.
- **Train** — a random blessing for the rest of the run (+25% Attack, +35%
  Defense, +20% Max HP or +15% Crit).
- **Scavenge** — half the time the rubble is empty; otherwise potions,
  cores, materials, gold or gems — and a 5% chance of a **golden chest**
  (an epic/legendary item, a pile of gold, gems and Boss Cores, materials,
  potions, and a small chance at an artifact).

## Loot, currency and materials

- Monsters drop **gold** (spent in-run, reset every time you re-enter the
  dungeon) and **gems** 💎 — the only currency, permanent, shown in the top bar.
- **Cores are inventory items, not currency.** Their look tells you what killed
  them: a monster core is a round gem that is dull and cloudy from shallow
  floors and blazes with light from deep ones — Dull (floors 1-25), Glimmering
  (26-50), Radiant (51-75), Blazing (76-100) — plus the red **Boss Core** torn
  from bosses. Each carries *core power* (1/2/3/4, and 9 for a Boss Core);
  recharging an artifact costs 3 core power (dullest spent first) or one Boss
  Core for three charges. Cores are also a **crafting material in their own
  right** — recipes ask for them by tier ("4× Glimmering Core or better"), and a
  brighter core always stands in for a duller one. Legendary recipes demand Boss
  Cores by name. Cores get their own **Cores** tab in the inventory.
- **Crafting materials** drop as you descend: Iron Ore, Timber, Cloth Scrap and
  Tough Hide from anything, plus a signature material per monster family — Bone
  Shard, Bog Resin, Ember Cinder, Frost Crystal, Venom Sac, Rune Stone, Storm
  Feather, Ectoplasm, Magma Clot and Ashen Dust. Salvaging gear returns
  materials too. Drop rates are weighted toward **what the forge actually asks
  for** — iron is the most common by a wide margin, then hide, cloth and timber
  — and stacks grow as you descend, so deep recipes stay reachable without
  grinding shallow floors. A monster's signature material only drops from that
  family, and the rest of the game's material rewards (scavenging, chests, the
  merchant's stock) use the same weighting instead of picking evenly from all
  fourteen.
- **Potions**: health, energy, three buffs (attack / defense / crit for 3
  turns) and three debuffs you throw at the enemy (weaken, corrode, drain its
  charge). Usable from the battle Inventory action.
- **Gem Shop** (Play hub) sells one-time blessings that activate on your next
  run and are then spent: Draught of Might, Ironhide Charm, Lucky Coin,
  Scholar's Insight (3 free hints), Phoenix Feather (one revive).
- **Mysterious Merchant** — found by searching a cleared floor. Sells potions,
  cores, materials and a **monster skill book** for your class, priced in the
  gold you've collected this run.
- **Skill books** teach a monster's own move (Bone Shard, Life Siphon, Ember
  Burst, Frost Nova, Venom Fang, Stone Fist, Gale Slash, Soul Drain, Molten
  Bite, Dark Pact) and only work for compatible classes.

## The Dwarf's Trial (rare event)

Search a cleared floor deep enough in and a soot-black dwarf may flag you down:
something is nesting in his side-tunnel. He turns up at most once per run. Accept and the dungeon gives way to a forge-lit trial — the floor
counter becomes **Stage 1/5** and five unique foes come at you in sequence
(Rustplate Sentinel, Cavern Lurker, Grudge Wraith, Forge Hound, Deep Warden),
each with its own mechanic. Clear them and Durin asks how he can repay you:

- **Shop** — his pack: epic and legendary gear, bulk materials, Boss Cores, and
  sometimes a **legendary blueprint** (it goes into your Backpack as an item to
  study). The pieces he values most cost serious gold.
- **Steal** — he unstraps a gold-chased greataxe. He is one of the four who
  walked to the hundredth floor, and only he walked back. Legendary plate turns
  aside half of every hit, charged swings land twice, and he drinks a draught at
  half health. Expect to need ~80 floors of progress and legendary gear. Beat
  him and you take his weapon, two blueprint items, gold, gems and Boss Cores.
- **Nothing** — he refuses to accept that and presses gold and Boss Cores on you
  anyway.

## Artifacts

Four fixed artifacts, each recharged with cores (3 core power per charge, or
one Boss Core for three). You can **equip 2 at once**:

1. **Phoenix Ember** — revives you at 30% HP once per fall.
2. **Owl's Lens** — use mid-question to eliminate a wrong option / reveal a hint.
3. **Fortune Coin** — +15% item/artifact drop chance while charged.
4. **Titan's Core** — permanently boosts a base stat of your choice (HP/ATK/DEF/Energy) while charged.

Every 10th-floor boss has a 10% chance to drop an artifact you don't yet
own, and boss floors are repeatable forever via Boss Rush.

## Crafting, Inventory & Index

- **Craft** forges weapons and armor from materials and cores; higher rarities
  need a deeper Highest Floor reached. **Legendary recipes are invisible at the
  forge until you learn them.** A blueprint drops as an *item* into your
  Backpack (only a certain dwarf carries them); **Study blueprint** consumes it
  and permanently unlocks that one legendary weapon/armor recipe — which then
  appears in Craft with its material, core and Boss Core costs.
- **Inventory** shows your character with Weapon/Head/Chest/Legs/Artifact
  slots, a Backpack (gear, potions, materials and unread blueprints), a **Cores**
  tab, a separate long-term **Stash**, and the Artifact Shrine (equip/recharge
  artifacts).
- **Index** is a discovery-gated bestiary/catalog — undiscovered weapons,
  armor, artifacts and monsters render in grayscale as "???" until you find
  them; discovered entries show full stats, description and drop chance.

## Class passives

Each class always has one thing working for it, shown as a live tag on the
battle screen:

- **Warrior — Bulwark.** Takes 15% less damage, and the more of its health is
  gone the harder it hits, up to +30%. It hits hardest the closer it gets to
  going down.
### One weapon type each, and a legendary that means something

Five types, one per class, and the lock is the point: a dagger is a rogue's
dagger. **Sword** (warrior), **Staff** (mage), **Dagger** (rogue), **Mace**
(cleric), **Fighting Gloves** (brawler). Picking who to bring is picking which
of these you can use, and a legendary you cannot equip is a reason to bring the
class that can.

Only the legendary of each line carries a passive, and each is written for what
its class is already trying to do:

- ⚔ **Dragonfang** (warrior) — Bulwark bites deeper: **+60%** at low health instead of +30%.
- 🪄 **Infernal Ruin** (mage) — anything you set alight burns for **two turns longer**.
- 🔪 **Nightfall** (rogue) — you can hold a **fourth** open wound, and Venomcraft pays **16%** a stack instead of 12%.
- 🔨 **Aureate Judgment** (cleric) — holy against the undead lands at **×2** instead of ×1.5.
- 🥊 **Ninth Heaven** (brawler) — Shatter reaches full in **three** blows instead of five.

**Equipment belongs to whoever is wearing it.** Every class keeps its own
loadout and they do not share: the backpack is common, because you loot
together, but a helm hung on the warrior is not also on the rogue. Equipping
something another class has takes it off them, and the picker says so. (Boots
could not be equipped at all before this — they were missing from the slot
picker entirely.)

- **Mage — Attunement.** A critical spell refunds 1 energy, so a hot streak
  pays for the next one. The mage no longer shreds armour: armour-piercing is
  the brawler's whole identity and having a second class do it better from
  across the room left Shatter with nothing to be.
- **Rogue — Ambush & Venomcraft.** The first strike on each floor is a
  guaranteed critical and all crits hit 15% harder; on top of that, every
  poison or bleed stack still open on the enemy adds **+12% damage** to
  everything the rogue does. Three stacks is +36%, which is why the class comes
  into its own on a boss that lives long enough to be worn down.
- **Cleric — Grace.** Every correct answer mends 4% of max HP, so a long clean
  streak is its own healing. Every cleric skill deals **Holy** damage.
- **Brawler — Combo, Momentum & Shatter.** Every consecutive correct answer
  adds +8% damage up to +40%; +5% damage for every point of **Speed** he has
  over the thing in front of him, up to +35%; and every blow he lands **cracks
  20% more of the enemy's armour off** for the rest of the fight. By the fifth
  blow his fists ignore defense entirely and deal **true damage** — 400 defense
  and none at all take exactly the same hit. He is the answer to a Plated one or
  a boss: against 18 defense his Jab climbs from 3 to 11 as the armour comes
  off, and the `−N its defense` line in the damage chain shrinks to nothing and
  is replaced by `TRUE — its armour counts for nothing`.

## Characters

Five classes, each with its own persistent level, weapon line and 8-node skill
tree (3 tier-1 passives, 3 tier-2 passives/ultimate unlock, 2 tier-3
**evolutions** — pick one of two). Switching class keeps that class's own
progress, and **Reset Skill Tree** is free, so you can try both evolutions.

| Class | Style | Passive | Evolutions |
|---|---|---|---|
| Warrior | Sword & shield bruiser | — | Berserker / Paladin |
| Mage | Ranged spellcaster | — | Pyromancer / Battlemage |
| Rogue | Crit and utility | — | Assassin / Trickster |
| Cleric | Self-healing support | — | Templar / Oracle |
| **Brawler** | Masked pit-fighter, bare fists | **Combo** — each consecutive correct answer adds +8% damage, up to +40% | Grandmaster / Iron Monk |

The Brawler chains multi-hit strikes (One-Two, Uppercut, Hundred Fists) and is
rewarded for answer streaks — one wrong answer and the combo resets.

## Study tools

- **Subjects**: the subject bar creates, renames and deletes subjects. Each one
  is both a study deck and its own dungeon realm, and picks up a fitting icon
  from its name.
- **Upload to AI**: drop in `.txt` / `.md` / `.pdf` files. Each chunk comes
  back as study notes *and* exam questions for the selected subject, which
  immediately double as that realm's combat questions.
- Works fully **offline and free**: with nothing set up at all, a local
  generator makes notes and questions on its own (see below). One rung up,
  **Local model (Ollama)** runs a model on your own machine — no key, no bill,
  no network — and is the free option in the model picker.
- **AI Settings**: paste your own Anthropic API key to enable live AI
  analysis (sent directly from your browser to `api.anthropic.com`; stored
  only in this browser's local storage, never anywhere else), and pick the
  model — your key, your bill, your call.
- **Flashcards**: flip-card review with a mastery bar and spaced-repetition
  weighting (wrong/unseen cards resurface sooner).
- **Quiz Practice**: risk-free practice using the same question engine as the
  Dungeon, with the same Easy / Medium / Hard switch.
- Overall flashcard mastery across all subjects feeds a small combat crit
  bonus — real studying makes your character stronger.

### What a question carries

A card used to be a front and a back. That was the ceiling on the whole game:
multiple choice had nothing to build its wrong options out of except **other
cards' answers**, so a chemistry answer would turn up under a history question
and you could pick the right one knowing nothing at all. Every card now comes
back with four more fields, and each one buys something:

| field | what it is for |
|---|---|
| `wrong` | three wrong answers written **for this question** — the neighbouring term, the one it is confused with, the right idea with the wrong number. They are what multiple choice offers you now. |
| `why` | one sentence on why the answer is right, shown **only when you get it wrong**, in the dungeon and in review. That is the one moment anybody is reading. |
| `topic` | two or three words naming the sub-topic, reused across every question about the same thing. |
| `level` | recall / apply / analyse, so a deck is not fifteen definitions. |

The built-in demo deck carries all four too, so the wrong answers and the
explanations are working on floor one, before you have uploaded anything.

`topic` and a per-card miss count pay for **"What you keep getting wrong"** at
the top of Study: not how you are doing, but *which part* you keep missing —
and the same two numbers raise those cards' weight in the dungeon's own
question picker, so what the list names is what the monsters start asking.

### The call itself

One request per chunk, and four things changed in it:

- **`max_tokens` was 1400.** Notes plus a dozen questions does not fit in 1400
  tokens, so the reply was being cut off mid-sentence, the parse failed, and
  every chunk quietly fell through to the offline generator — which is why the
  AI never seemed to be doing much. It is 16000 now.
- **The format is the API's job.** It used to be a `FLASHCARDS_JSON:` marker
  the reply had to be sliced apart on; one stray word and every question in the
  chunk was silently lost. It is a JSON schema on `output_config.format` now,
  so what comes back is valid or the request fails loudly.
- **The instruction moved to a `system` prompt** and the source material goes in
  the user turn inside `<extract>`, with a line telling the model that anything
  in there that reads like an instruction is course material to write questions
  about. Uploaded coursework is untrusted text.
- **Rate limits are waited out** rather than treated as a failure — a 429 or a
  529 used to cost you the whole chunk.

The model defaults to Claude Opus 5 with adaptive thinking; Sonnet 5 and Haiku
4.5 are one radio button away in AI Settings. The difference shows up almost
entirely in `wrong`: writing three wrong answers a student would actually pick
is a harder problem than writing the right one.

An API key is a **pay-as-you-go developer account with a card on it** — not a
Claude subscription, which does not come with one. The settings screen says so
in as many words before you paste anything, with rough per-upload costs, because
the old screen did not and somebody could quietly run up a bill.

### Free, in three rungs

| | needs | what you get |
|---|---|---|
| **Offline generator** | nothing at all | structure-driven questions, typed wrong answers, explanations lifted from the next sentence |
| **Local model (Ollama)** | Ollama installed | real generated questions, on your own machine, offline |
| **Claude** | an API key, or a deck someone else made | wrong answers built from actual misconceptions |

**Ollama** is a provider in the same model picker: its own request shape, the
JSON schema in `format` rather than `output_config`, and a *Test connection*
button. The thing that catches everyone is CORS — a page opened from a `file://`
URL has origin `null`, so Ollama refuses it unless started with
`OLLAMA_ORIGINS=*`. The settings screen says that too, since otherwise it just
looks broken.

### Fixing a card

Anything generated can be wrong, and a card whose wrong answer is actually
right will mark you wrong every time it comes up and teach you the mistake.
You could delete a card but never fix one, and you could not even *see* its
wrong answers — flipping it showed you the front and the back and nothing else.

The Flashcards screen now shows what a card is carrying (its topic, whether it
has wrong answers of its own, whether it has an explanation) and **Edit card**
opens the lot: question, answer, explanation, wrong answers one per line, topic.
An option identical to the answer is dropped on save, because that one marks a
right answer wrong.

### A deck is a file

Export writes every card with its wrong answers, explanation, topic and level;
import merges. Cards you already have are **left alone**, except that a missing
explanation or an empty `wrong` list gets filled in — so re-importing a
corrected deck upgrades the old cards instead of duplicating them, and importing
the same file twice does nothing. Everything out of the file is validated rather
than trusted; a card missing its question or its answer is dropped.

This is what makes the model choice not matter much: the game stops caring where
a question came from. This browser's AI, a local model, a classmate, or JSON
somebody wrote by hand — all the same to it.

### What the offline generator actually does

It is not an AI and never will be, but it is no longer a keyword drill. The old
one took the highest-scoring sentences, used them as the notes, blanked the
longest word in each and called it a question — so on a paragraph about
respiration it produced four fill-in-the-blanks, drawn from the four sentences
it had just shown you as notes, all four sharing **one pool of four
distractors**. If the answer was a number you could find it without reading the
question.

The new one reads structure instead. It harvests what a document is made of —
headings, bold and repeated terms, defined terms, numbers, places, lists — and
asks the question each one supports:

- a **number**, blanked, with other numbers from the same document beside it
- **where** something takes place, against other places
- **which of these does NOT belong**, with the other three taken from the list it came from
- **how many parts** something has
- **which term is this**, with a definition as the prompt and the term as the answer
- and only then a blank, on a term rather than the longest word, one per sentence

Three rules do most of the work. Wrong answers are **the same type as the right
one**, so a number never sits beside three verbs. An option that is still
**readable in the question** is thrown out and the slot refilled — offering
"pyruvate" under "splits _____ glucose molecule into two molecules of pyruvate"
is a free point, and the old generator did that on nearly every card. And the
**next sentence becomes the explanation**, because textbooks tend to explain
themselves in the following line.

On the same three test documents it went from 4 questions with one recycled
distractor pool to 8–9 with typed wrong answers and explanations on most of
them. It still cannot write a genuine misconception — that needs understanding —
but it no longer hands you the answer.

Two rules in the first cut of it were too strict, and together they could
return **nothing at all** from a short note. Words had to appear twice to enter
the distractor pool, which on three sentences means almost none do; and a card
with fewer than two wrong answers of its own was thrown away. Below a working
minimum the pool now takes the longest words that appeared once, and no card is
ever dropped for being thin — multiple choice already tops its options up from
the rest of the deck, so a thin card is just the old behaviour, whereas no card
is nothing to answer.

## Installing it as an app

It installs to a home screen or a dock with its own icon, opens in its own
window with no browser chrome, and **starts with no connection at all** — the
shell is cached by a service worker.

Nothing was traded for it. Service workers do not exist on a `file://` page, so
the registration block is inert when you open the file off disk and the game is
exactly what it has always been: one file you can email to yourself. Served over
http(s), the same file is installable.

| where | how |
|---|---|
| **iPhone / iPad** | Safari → Share → *Add to Home Screen* |
| **Android** | Chrome → ⋮ → *Install app* |
| **Desktop** | the install icon in the address bar (Chrome / Edge) |

Publishing is a GitHub Actions workflow (`.github/workflows/pages.yml`) that
deploys `index.html`, the manifest, the worker and the icons on every push to
`main`. **One setting has to be flipped by hand, once:** *Settings → Pages →
Source: **GitHub Actions***.

The worker is deliberately dull. It caches the shell — page, manifest, icons —
and nothing else, because everything the game needs is already inside
`index.html`. The page is network-first so a deployed update is picked up as
soon as there is a connection, with the cache as the fallback rather than the
source of truth; the icons are cache-first. **Requests to `api.anthropic.com`
are never touched** — a cached answer would be wrong and a cached failure would
be worse. Bump `CACHE_V` in `sw.js` on release and open tabs reload themselves
onto the new version instead of sitting behind it.

The icons are the game's own art: the warrior, rendered from the same sprite
sheet the dungeon uses, on the dungeon's own background.

## Persistence

Uses `window.storage` when available (e.g. inside a hosted artifact
runtime), falling back to `localStorage` automatically, so the app also
works as a plain static file. Realms are stored separately from the shared
Index, and saves from earlier versions are migrated into the realm you were
last playing.


## Balance, measured rather than argued

`tools/soak.js` plays all five classes to floor 100 answering correctly 75% of
the time. Before this pass, turns per floor by band:

| | f1–20 | f21–40 | f41–60 | f61–80 | f81–100 | level | deaths |
|---|---|---|---|---|---|---|---|
| mage | 4.3 | 4.6 | 6.1 | **5.7** | 5.1 | **40** | 34 |
| brawler | 4.4 | 5.0 | 6.1 | **5.2** | 6.0 | **40** | 18 |
| warrior | 4.5 | 7.2 | 10.0 | **18.0** | — | 28 | 10 |
| cleric | 4.4 | 7.0 | 11.9 | **11.5** | — | 29 | 8 |
| rogue | 4.8 | 8.3 | **14.1** | — | — | 27 | 6 |

The real finding is the **level** column, not the turn counts. Mage and brawler
reach 40 and see floor 90; the other three stall at 27–29 and never reach 60.
It compounds: killing faster earns levels faster, which kills faster. The
deaths column shows the trade working in the other direction — the slow three
are much safer — but safe and unable to finish is not a playstyle.

Three surgical changes rather than blanket inflation, each against a named
structural fault:

- **The rogue was taxed on its own opener.** Venomcraft pays it for every open
  wound and charges it ×0.75 when there are none — and that charge was landing
  on the first swing of every fight, the one turn it cannot possibly have a
  stack yet. The charge now waits until a fight is under way, and softens to
  ×0.85.
- **The cleric is the only class with no damage passive at all** — Grace is
  pure sustain — and it carried the lowest attack in the game on top of that.
  Base attack 9 → 10, growth 1.2 → 1.45.
- **Bulwark's damage half almost never switched on.** It needed the warrior
  below 50% HP, which for the class that takes 15% less and heals between
  floors is rare enough that it read as a passive it did not really have. It
  now ramps from 35% missing.

Nothing was taken off the mage or the brawler. At floor 90 the static probe
moves the rogue 68 → 77 damage a turn and the cleric 80 → 92, with those two
untouched at 153 and 113.

### The harness could not measure its own change

The confirming soak said this:

| | b2 | b3 | level | deepest floor | touched? |
|---|---|---|---|---|---|
| warrior | 7.2 → **10.0** | 10.0 → 10.9 | 28 → 28 | 63 → 60 | yes |
| mage | 4.6 → 4.5 | 6.1 → 6.5 | 40 → 40 | 98 → **91** | **no** |
| rogue | 8.3 → **6.2** | 14.1 → **10.9** | 27 → **29** | 58 → **64** | yes |
| cleric | 7.0 → 6.5 | 11.9 → **8.9** | 29 → **31** | 63 → **68** | yes |
| brawler | 5.0 → 4.7 | 6.1 → 6.4 | 40 → 40 | 90 → 93 | **no** |

Read the two untouched rows first. The mage lost seven floors and its deepest
band went from 5.1 to 7.4 turns a floor **with nothing changed that affects
it**. That is the noise floor, and it is the same size as the effect being
measured — so of the three rows that were touched, only the rogue's is a
result: every band improved, it reached a band it had never reached, and it
gained two levels. The warrior's b2 getting *worse* is the giveaway, since
the Bulwark edit can only ever add damage and cannot slow it down.

So `soak.js` now takes a run count and averages: `node tools/soak.js 0.75 3`.
Each band shows its spread and how many runs actually reached it, because
`b4 8.7t (1/3)` is one lucky run rather than a measurement. A fourth argument
narrows it to one class, so re-checking a single tune costs a quarter of an
hour instead of an hour and a quarter. One run per class cannot tune a class,
and it took a change that moved an untouched class by 45% to make that obvious.

### What three runs each actually said

Deepest floor reached on a fixed time budget — so deeper is faster, and with
three runs the *spread* is the thing to read, not the mean:

| | before | after, 3 runs | verdict |
|---|---|---|---|
| rogue | 58 | 63, 75, 74 | **confirmed** — +13 floors, and its worst run beats the old best |
| cleric | 63 | 67, 83, 88 | **confirmed** — +16 floors, same |
| warrior | 63 | 58, 69, 66 | **nothing** — the spread straddles the old value |
| mage | 98 | 98, 100, 100 | untouched; clears the tower in two runs of three |
| brawler | 90 | 92, 100, 100 | untouched; same |

The rogue and the cleric hold up. The warrior did not move at all, which fits
the diagnosis rather than contradicting it: Bulwark's damage half is gated on
being hurt, and the warrior is the one class built not to get hurt — 15% off
everything it takes, the second-highest HP in the game, and a full heal between
floors. Widening the gate from 50% missing to 35% made a passive that almost
never fires fire slightly less rarely, which is not the same as giving the
class damage. So it also gets what worked for the cleric: attack growth 1.4 →
1.55, which is unconditional and does not depend on a state the class spends
its whole design avoiding.

That re-check (three more runs, warrior only) came back **61, 69, 79** against
the old 63 — a spread that overlaps, so the depth figure alone proves nothing.
The two numbers that do move cleanly are the ones that are not a wall-clock
race: the deepest band it reached went from **18.0 turns a floor to 10.0**, and
it now averages **level 34 where it used to stall at 28**. Same fight, nearly
twice the pace.

### Where it landed

| | worst band, turns/floor | level | deepest floor | deaths |
|---|---|---|---|---|
| mage | 5.7 → 6.5 | 40 | 98 → 99 | 30 |
| brawler | 5.2 → 5.8 | 40 | 90 → 97 | 18 |
| cleric | 11.5 → 13.3 | 29 → 31 | 63 → **79** | 6 |
| rogue | 14.1 → 10.9 | 27 → 29 | 58 → **71** | 12 |
| warrior | **18.0 → 10.0** | 28 → **34** | 63 → **70** | 5 |

Two fast and fragile, three slower and much safer — the mage dies thirty times
getting to the bottom and the warrior five times not quite getting there. That
is a trade. What it was before was two classes that finish the game and three
that stop dead around floor 60 while levelling six behind, which is not a
playstyle, it is a wall. Nothing was taken off the mage or the brawler at any
point in this.
---

## Ads: the hint, the revive, and what it takes to actually get paid

Three things are offered in exchange for watching something, and all three are
opt-in — a panel comes up first and *No thanks* is always the other button:

| | limit | what it gives |
|---|---|---|
| **Hint** | 3 a run | Rules out a wrong answer, names the topic the card is filed under, and shows your own explanation of it **with the answer struck out** |
| **Revive** | 1 a run, only after you die | Back on the same floor at half health, same fight, where it stopped |
| **Run-end break** | once a run | Five seconds when a run finishes — death, victory, or fleeing |
| **Floor break** | every 30 floors | Three in a hundred-floor descent, on the stairs — never mid-question, never mid-fight |

Nothing in there is locked behind an ad that you could not already get by
playing: the Lens artifact and the Insight blessing still give hints for free,
and the ad hint is only offered once those are spent. The run-end break is
rate-limited so that fleeing three times in a row is still one break.

### The honest part

**The game ships with no publisher ID, so it currently earns nothing and makes
no outside request.** Ad code that is not configured plays a *house break* — a
real five-second countdown with a close box that costs you the reward, so the
mechanic can be built and tested — and it says on it that no network is
configured. Nobody is told they are earning when they are not.

### Turning it on

The network is [Google's H5 Games Ads](https://adsense.google.com/start/h5-games-ads/),
which is the one that pays a *browser* game per view. It needs four things,
and none of them can live inside `index.html`:

1. **An approved AdSense account.** [You must be 18](https://support.google.com/adsense/answer/14230?hl=en) —
   under that, a parent or guardian applies with their own Google account and
   **every payment goes to them**, not to you. There is no way around this one.
2. **A site on a domain you own.** A free subdomain — `*.github.io` included —
   is a weak-to-hopeless candidate for approval, so the GitHub Pages workflow
   in this repo wants a custom domain pointed at it before you apply.
3. **H5 Games Ads granted on that account** — a separate application on top of
   AdSense approval. [Sign-up details here.](https://support.google.com/adsense/answer/1705831?hl=en)
4. **Your publisher ID pasted into Settings → Ads**, and **test mode turned
   off.** Test mode shows Google's fake ads and pays nothing; it is on by
   default so that a half-finished setup never looks like it is working.

Payout is at $100, and rewarding an ad *click* — as opposed to a view — is a
policy breach that gets accounts closed, which is why nothing in here does it.

### The two settings worth understanding

- **Test mode.** On by default. Leave it on until the site is live and
  approved; turn it off the day it is.
- **Give the reward anyway when no ad is available.** Also on by default. It is
  what keeps the game playable offline and behind an ad blocker — an installed
  PWA on a train has no network and therefore no ad. Turning it off earns more
  and breaks that. It is a real trade and it is yours to make.

### Ad density — the one number to think about

`AD_FLOOR_EVERY` is how many floors pass between breaks on the stairs. It is
**30**, so three in a whole hundred-floor descent — a rest stop, not a toll
booth. The break that matters is the one at the end of a run. Set it to `0` to
turn stair breaks off entirely. `AD_MIN_GAP` (40s) sits under all of it: two
breaks never land closer together than that, whatever else says otherwise.

### The three functions everything goes through

The game calls exactly three things and nothing else, so the network
underneath can be swapped without touching a game rule:

```js
showRewardedAd_Hint()        // resolves true only if the ad was actually watched
showRewardedAd_Revive()
showInterstitialAd(where)    // 'run-end', 'floor-12', …
```

Each one logs to the console and carries the `// TODO` marker where an SDK
hooks in.

### About AdMob specifically

**AdMob cannot run in a web page.** It is a native mobile SDK — there is no
publisher key, no script tag and no configuration that makes it work in a
browser, so it is deliberately not wired here. For a page, H5 Games Ads is the
equivalent product and it is what the `Ads` object speaks.

AdMob becomes the right answer the moment this is wrapped as a real Android or
iOS app (Capacitor, or a TWA for the Play Store). At that point a native plugin
does the talking and the three functions above are where it hooks in — one
provider added to `Ads`, not a rewrite. Nothing in this repo does that yet.
