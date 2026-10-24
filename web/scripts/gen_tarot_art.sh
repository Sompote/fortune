#!/usr/bin/env bash
# Generates the 78 tarot card faces with Codex image generation (codex exec, image_generation feature).
# Output: web/public/tarot/raw/<id>.png (1024x1536). Run ./scripts/shrink_tarot_art.sh afterwards.
# Usage: scripts/gen_tarot_art.sh [parallel=5] [only-missing=1]
set -uo pipefail
cd "$(dirname "$0")/../public/tarot"
mkdir -p raw
PAR="${1:-5}"
STYLE="antique engraved tarot illustration in the Rider-Waite tradition, rich hand-tinted colours on aged parchment, deep indigo and gold palette with warm accents, ornate symmetrical gold filigree border, fine linework, mystical and atmospheric, portrait 2:3, the artwork fills the frame edge to edge. ABSOLUTELY NO text, letters, numerals or captions anywhere in the image."

# id|scene
CARDS='M0|The Fool: a carefree young traveller stepping toward a cliff edge, small bundle on a stick, white rose in hand, a little white dog leaping at his heels, bright sun above mountains
M1|The Magician: a robed figure before a table with a cup, pentacle, sword and wand, one arm raised to the sky holding a wand, infinity symbol glowing above the head, roses and lilies around
M2|The High Priestess: a veiled priestess seated between a black pillar and a white pillar, crescent moon at her feet, a scroll in her lap, pomegranate tapestry behind
M3|The Empress: a crowned woman on a cushioned throne in a golden wheat field, flowing river and forest behind, shield with a venus sign, lush abundance
M4|The Emperor: a bearded ruler on a stone throne carved with ram heads, red robe and armour, ankh sceptre and orb, barren red mountains behind
M5|The Hierophant: a high priest in triple crown and red robe between two grey pillars, hand raised in blessing, two tonsured acolytes kneeling, crossed keys at his feet
M6|The Lovers: a man and a woman in simple flowing robes standing in a garden gazing at each other beneath a radiant angel with spread wings and a sunburst, a fruit tree with a serpent, a tree of flame, a mountain in the distance
M7|The Chariot: an armoured charioteer standing in a stone chariot drawn by a black sphinx and a white sphinx, starry canopy, walled city behind
M8|Strength: a serene woman in a white dress gently closing the jaws of a lion, infinity symbol over her head, garland of flowers, soft hills
M9|The Hermit: an old cloaked hermit on a snowy mountain peak holding a lantern with a glowing six-pointed star and a tall staff, night sky
M10|Wheel of Fortune: a great golden wheel in the sky with a sphinx on top, a serpent and a jackal-headed figure on its sides, four winged creatures reading books in the corners, clouds
M11|Justice: a crowned figure seated between pillars holding an upright sword and golden scales, red robe, purple veil behind
M12|The Hanged Man: a man hanging upside down by one foot from a living T-shaped tree, legs crossed, hands behind back, calm face with a golden halo
M13|Death: a skeleton knight in black armour on a white horse carrying a black banner with a white rose, fallen king, bishop and child before him, sunrise between two towers
M14|Temperance: a winged angel with one foot in a pool and one on land pouring water between two golden cups, iris flowers, a path to glowing mountains
M15|The Devil: a horned bat-winged demon crouched on a black stone pedestal, inverted pentagram on its brow, torch held downward, a chained robed man and woman with small horns standing below in shadow
M16|The Tower: a tall tower on a crag struck by lightning, its crown blown off, flames and two figures falling, dark stormy sky with falling sparks
M17|The Star: a graceful woman in a thin draped gown kneeling by a pool pouring water from two jugs, one onto the land and one into the water, a large golden eight-pointed star and seven smaller stars above, an ibis in a tree
M18|The Moon: a full moon with a face dripping dew between two towers, a dog and a wolf howling, a crayfish crawling from a pool, a winding path into the distance
M19|The Sun: a radiant sun with a serene face, a joyful small child in a light tunic with a feather crown riding a white horse, a large red banner, tall sunflowers over a garden wall
M20|Judgement: an angel with a trumpet in the clouds, grey figures rising from coffins with arms raised, mountains and water behind
M21|The World: a dancing figure wrapped in a purple sash inside a great laurel wreath holding two wands, a human, eagle, bull and lion head in the four corners
W1|Ace of Wands: a hand emerging from a cloud holding a sprouting wooden wand with fresh leaves, a castle on a hill and a river below
W2|Two of Wands: a robed man on a castle battlement holding a small globe and a wand, a second wand fixed to the wall, looking out over sea and mountains
W3|Three of Wands: a merchant seen from behind standing on a cliff between three planted wands watching ships sail on a golden sea
W4|Four of Wands: four tall wands garlanded with flowers and fruit forming a canopy, two celebrating figures with bouquets, a castle behind
W5|Five of Wands: five young men brandishing wooden staves in a chaotic playful skirmish under a clear sky
W6|Six of Wands: a laurel-crowned rider on a white horse holding a wand with a victory wreath, cheering crowd carrying wands around him
W7|Seven of Wands: a man on a hilltop defending himself with a staff against six staves raised from below
W8|Eight of Wands: eight wands flying diagonally through a clear sky over green hills and a river
W9|Nine of Wands: a bandaged wary man leaning on a staff, eight staves standing like a fence behind him
W10|Ten of Wands: a bent man struggling to carry a heavy bundle of ten staves toward a distant town
W11|Page of Wands: a young page in a salamander-patterned tunic holding a tall budding wand, pyramids in a desert behind
W12|Knight of Wands: an armoured knight on a rearing chestnut horse raising a wand, flaming plume, desert pyramids behind
W13|Queen of Wands: a queen on a throne carved with lions and sunflowers holding a wand and a sunflower, a black cat at her feet
W14|King of Wands: a king on a throne decorated with lions and salamanders holding a tall flowering wand, a small salamander beside him
C1|Ace of Cups: a hand from a cloud holding a golden chalice overflowing with five streams of water, a white dove descending, lotus flowers on a pond
C2|Two of Cups: a man and a woman exchanging cups beneath a winged lion head over a caduceus, a house on a hill behind
C3|Three of Cups: three women dancing in a circle raising cups, harvest of fruit and pumpkins around their feet
C4|Four of Cups: a young man sitting with crossed arms under a tree ignoring three cups, a fourth cup offered by a hand from a cloud
C5|Five of Cups: a cloaked figure in black mourning over three spilled cups while two upright cups stand behind, a bridge to a castle across a river
C6|Six of Cups: a child giving a cup filled with white flowers to a smaller child in an old village courtyard, six cups of flowers
C7|Seven of Cups: a silhouetted figure facing seven cups floating in clouds holding a castle, jewels, a wreath, a dragon, a serpent, a veiled head and a glowing figure
C8|Eight of Cups: a cloaked traveller with a staff walking away from eight stacked cups toward mountains under an eclipsed moon
C9|Nine of Cups: a satisfied man seated with crossed arms before a curved table displaying nine golden cups
C10|Ten of Cups: a joyful couple with raised arms and two dancing children under a rainbow of ten cups, a cottage and river
C11|Page of Cups: a young page in a floral tunic holding a cup from which a fish peeks out, waves behind
C12|Knight of Cups: a knight on a calm white horse holding a cup forward, winged helmet, a river and cliffs
C13|Queen of Cups: a queen on a shell throne at the sea shore gazing at an ornate closed chalice
C14|King of Cups: a king on a stone throne floating on a rough sea holding a cup and a sceptre, a fish and a ship in the waves
S1|Ace of Swords: a hand from a cloud holding an upright sword piercing a golden crown with laurel and palm, jagged mountains below
S2|Two of Swords: a blindfolded woman seated before the sea holding two crossed swords, a crescent moon above
S3|Three of Swords: a red heart pierced by three swords against grey rain clouds
S4|Four of Swords: a knight effigy lying in prayer on a stone tomb in a chapel, three swords on the wall and one beneath, a stained-glass window
S5|Five of Swords: a smirking man gathering swords while two defeated figures walk away under a jagged stormy sky
S6|Six of Swords: a ferryman poling a boat carrying a cloaked woman and child across calm water, six swords standing in the boat
S7|Seven of Swords: a man sneaking away from a military camp carrying five swords, two left behind, tents in the background
S8|Eight of Swords: a bound and blindfolded woman standing among eight swords in muddy ground, a castle on a cliff behind
S9|Nine of Swords: a figure sitting up in bed with face in hands, nine swords hanging horizontally on the dark wall, a quilt of roses and zodiac signs
S10|Ten of Swords: a figure lying face down with ten swords in the back under a black sky, a golden dawn breaking on the horizon
S11|Page of Swords: a youthful page standing on a hill holding a sword upright, wind-blown hair and clouds, birds in flight
S12|Knight of Swords: an armoured knight charging on a white horse with raised sword, wind-torn trees and streaking clouds
S13|Queen of Swords: a stern queen on a throne with butterfly carvings holding a sword upright, one hand extended, clouds and a single bird
S14|King of Swords: a king on a stone throne carved with butterflies and crescents holding a sword, blue robe, two birds in a clear sky
P1|Ace of Pentacles: a hand from a cloud holding a large golden pentacle coin above a flowering garden with an arched hedge opening onto mountains
P2|Two of Pentacles: a dancing young man juggling two pentacles joined by a lemniscate ribbon, ships riding tall waves behind
P3|Three of Pentacles: a stonemason on a bench carving in a cathedral, a monk and an architect holding plans, three pentacles in the arch
P4|Four of Pentacles: a crowned man clutching a pentacle to his chest, one on his head and two under his feet, a city behind
P5|Five of Pentacles: two ragged beggars in the snow passing a lit stained-glass window showing five pentacles, one on crutches
P6|Six of Pentacles: a wealthy merchant with scales giving coins to two kneeling beggars, six pentacles above
P7|Seven of Pentacles: a farmer leaning on a hoe gazing at a vine heavy with seven pentacles
P8|Eight of Pentacles: a craftsman on a bench chiselling a pentacle, finished pentacles displayed on a post, a town in the distance
P9|Nine of Pentacles: an elegant woman in a flowing gown in a lush vineyard with a hooded falcon on her gloved hand, nine pentacles among the vines, a manor behind
P10|Ten of Pentacles: an old man with dogs seated under an archway of a prosperous estate, a young couple and child, ten pentacles arranged like a tree of life
P11|Page of Pentacles: a young page in a green field holding up a single pentacle with reverent attention, a ploughed field and trees
P12|Knight of Pentacles: a knight on a heavy black horse standing still in a ploughed field holding a pentacle, oak leaves on helmet
P13|Queen of Pentacles: a queen on a throne carved with goats and fruit in a flowering bower cradling a pentacle, a rabbit nearby
P14|King of Pentacles: a king in a grape-patterned robe on a throne carved with bulls holding a pentacle and sceptre, castle and vines behind'

printf '%s\n' "$CARDS" > raw/cards.txt

gen() {
  local id="$1"
  local scene; scene="$(grep "^$id|" raw/cards.txt | cut -d'|' -f2-)"
  [ -n "$scene" ] || { echo "no scene for $id"; return 1; }
  [ "${ONLY_MISSING:-1}" = "1" ] && [ -s "raw/$id.png" ] && { echo "skip $id"; return 0; }
  for attempt in 1 2; do
    codex exec -s workspace-write --enable image_generation -c 'model_reasoning_effort="low"' \
      "Use your image generation tool to create ONE image and save it as ./raw/$id.png in the current directory (overwrite if it exists). Subject: a tarot card face showing $scene. Style: $STYLE After saving, print only the file path." >/dev/null 2>&1
    [ -s "raw/$id.png" ] && { echo "ok   $id $(date +%H:%M:%S)"; return 0; }
    echo "retry $id ($attempt)"
  done
  echo "FAIL $id"; return 1
}
export -f gen; export STYLE; export ONLY_MISSING="${2:-1}"
cut -d'|' -f1 raw/cards.txt | xargs -P "$PAR" -I{} bash -c 'gen "$@"' _ {}
echo "done: $(ls raw/*.png 2>/dev/null | wc -l | tr -d ' ') images in raw/"
