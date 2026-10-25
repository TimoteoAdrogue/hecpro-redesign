"""One-off copy pass (2026-10-25): every visible string now comes from hecpro.ch (ref/SOURCE-hecpro.txt)
or from the fiche itself (box titles and first lines, transcribed from ref/fiche/word/media).
Run once on index.html; each replacement asserts its source text is present exactly once (or n times)."""
import re

h = open('index.html').read()


def R(a, b, n=1):
    global h
    assert h.count(a) == n, (h.count(a), a[:100])
    h = h.replace(a, b)


def SUB(pat, b):
    global h
    h2, k = re.subn(pat, b, h, flags=re.S)
    assert k == 1, (k, pat[:80])
    h = h2


# ---- head
R('<title>HECPro · Réussir sa 1re année à HEC Lausanne</title>', '<title>HECPro - Réussir ta première année à HEC Lausanne</title>')
DESC = 'HECPro est une plateforme pensée pour réussir sa première année à HEC Lausanne. Les 7 matières sont structurées pour te faire gagner du temps, comprendre l’essentiel et arriver aux examens avec une préparation claire.'
SUB(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{DESC}">')
R('<meta property="og:title" content="HECPro · Réussir sa 1re année à HEC Lausanne">', '<meta property="og:title" content="HECPro - Réussir ta première année à HEC Lausanne">')
SUB(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{DESC}">')
SUB(r'"name":"Pack Découverte","description":"[^"]*"', '"name":"Pack Découverte","description":"Le point de départ pour comprendre HEC Lausanne, prendre tes repères et ne plus subir tes premiers cours."')
SUB(r'"name":"Pack Elite","description":"[^"]*"', '"name":"Pack Elite","description":"La préparation complète pour maîtriser les 7 matières, gagner du temps et arriver aux examens prêt à performer."')

# ---- nav, menu and every "go to the packs" button use the client's labels
for old, new in [('<a href="#packs">Packs</a>', '<a href="#packs">Packs HECPro</a>'),
                 ('<a href="#coaching">Coaching</a>', '<a href="#coaching">Coaching privé</a>'),
                 ('<a href="#avis">Avis</a>', '<a href="#avis">Avis Étudiants</a>')]:
    h = h.replace(old, new)
h = h.replace('>Choisir mon pack</a>', '>Découvrir les packs</a>')

# ---- hero
R('<h1 class="poster hero__title">La 1<sup>re</sup> année HEC ne se révise pas au hasard.</h1>', '<h1 class="poster hero__title">La 1ère année HEC ne se révise pas au hasard.</h1>')
R('<p class="lede">HECPro transforme les 7&nbsp;matières du premier semestre en un parcours clair&nbsp;: tu comprends plus vite, tu sais quoi maîtriser.</p>',
  '<p class="lede">HECPro transforme les 7&nbsp;matières du premier semestre en un parcours clair&nbsp;: tu comprends plus vite, tu sais quoi maîtriser et tu avances vers les examens avec une vraie direction.</p>')
R('          <a class="btn btn--soft" href="#apercu">Voir une fiche</a>\n', '')
R('<div class="wrap chips"><p>Les 7 matières&nbsp;:</p><ul><li>Comptabilité</li><li>Durabilité</li><li>Informatique</li><li>Management</li><li>Mathématiques I</li><li>Microéconomie</li><li>Statistiques I</li></ul></div>',
  '<div class="wrap chips"><ul><li>+150 étudiants HEC</li><li>7 matières</li><li>Accès immédiat</li><li>Satisfait ou remboursé 24h</li></ul></div>')

# ---- constat
R('''        <p class="stat__num" aria-hidden="true"><span data-stat-n>68</span><span class="stat__pct">%</span></p>
        <h2 id="constat-t" class="poster stat__line"><span class="sr-only">68 % </span>des étudiants ne passent pas le cap.</h2>''',
  '''        <p class="stat__kicker">La première année HEC ne pardonne pas l’improvisation.</p>
        <p class="stat__num" aria-hidden="true"><span class="stat__pre">Plus de</span><span data-stat-n>68</span><span class="stat__pct">%</span></p>
        <h2 id="constat-t" class="poster stat__line"><span class="sr-only">Plus de 68 % </span>des étudiants ne passent pas le cap.</h2>''')
R('<figcaption><span class="matrix__x"></span>ne passent pas le cap <span class="matrix__o"></span>passent</figcaption>', '<figcaption><span class="matrix__x"></span>ne passent pas le cap</figcaption>')
R('''Tu comprends mieux tes cours pendant le semestre, tu sais ce que tu dois maîtriser et tu arrives aux examens avec une préparation déjà construite.</p>
    </div>''', '''Tu comprends mieux tes cours pendant le semestre, tu sais ce que tu dois maîtriser et tu arrives aux examens avec une préparation déjà construite.</p>
      <p>Tu ne travailles plus au hasard. Tu avances avec une méthode, des repères et les bons outils pour transformer tes efforts en résultats.</p>
    </div>''')

# ---- tour: the client's heading, then the fiche's own box titles and texts
R('<h2 id="apercu-t" class="poster">Une vraie fiche, de près.</h2>', '<h2 id="apercu-t" class="poster">Un aperçu concret de ce qui t’attend.</h2>')
R('<p class="sub">Un aperçu concret de ce qui t’attend&nbsp;: claire, structurée et pensée pour aller directement à l’essentiel.</p>',
  '<p class="sub">Découvre une vraie fiche HECPro&nbsp;: claire, structurée et pensée pour aller directement à l’essentiel.</p>')
steps = [('ink', '1', 'Statistiques', 'Séries 1-2&nbsp;: données, graphiques, quantiles et boxplot.'),
         ('pen', '2', 'Objectif de la fiche', 'Comprendre comment transformer des données brutes en information statistique utile&nbsp;: données brutes → table de fréquences → graphique → interprétation.'),
         ('pen', '3', 'Définition', 'Une <b>variable</b> est une mesure d’un phénomène. Elle décrit une caractéristique observée sur des individus.'),
         ('teal', '4', 'Intuition statistique', 'Une variable qualitative répond à la question&nbsp;: “Dans quelle catégorie est l’individu&#8239;?”'),
         ('red', '5', 'Attention', 'Classes exclusives. Les classes doivent être <b>exclusives</b>. Une valeur ne doit appartenir qu’à une seule classe.'),
         ('pen', '6', 'Formule', 'Amplitude et centre de classe. Si l’on veut créer <i>k</i> classes entre <i>x</i><sub>min</sub> et <i>x</i><sub>max</sub>&nbsp;: <i>h</i> = (<i>x</i><sub>max</sub> − <i>x</i><sub>min</sub>) / <i>k</i>.')]
lis = re.findall(r'          <li data-page="\d" data-r="[^"]*"><span class="tab" data-c="\w+"><b>\d</b>[^<]*</span><p>.*?</p></li>', h)
assert len(lis) == 6, len(lis)
for li, (c, n, tab, txt) in zip(lis, steps):
    head = re.match(r'(          <li data-page="\d" data-r="[^"]*">)', li).group(1)
    h = h.replace(li, f'{head}<span class="tab" data-c="{c}"><b>{n}</b>{tab}</span><p>{txt}</p></li>')
R('<span>Statistiques · Séries 1 et 2</span>', '<span>Séries 1-2&nbsp;: données, graphiques, quantiles et boxplot</span>')

# ---- subjects: the names from the Elite page, no invented formulas; Statistiques keeps the fiche's own boxplot
R('<h2 id="matieres-t" class="poster">7 matières. Un guide et des fiches pour chacune.</h2>', '<h2 id="matieres-t" class="poster">Contenu du Pack.</h2>')
R('<p class="sub">Chaque matière&nbsp;: un guide pour comprendre son fonctionnement et ses attentes, puis des fiches qui reprennent les cours au fil du semestre.</p>',
  '<p class="sub">Tu retrouves les 7 matières du premier semestre, chacune avec un guide pour comprendre la matière, son fonctionnement et ses attentes, puis des fiches qui reprennent les cours au fil du semestre. L’idée est simple&nbsp;: tu sors du cours, tu ouvres HECPro et tu remets rapidement les choses au clair.</p>')
h, k = re.subn(r'\n          <p class="subj__f">.*?</p>(?=<img|\n)', '', h)
assert k == 7, k
SUB(r'<img class="subj__fig" (src="assets/fiche/boxplot.webp"[^>]*)><a class="subj__link" href="#apercu">Voir la fiche <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>',
    r'<a class="subj__fig" href="#apercu" aria-label="Un aperçu concret de ce qui t’attend"><img \1></a>')

# ---- semester: the client's three blocks verbatim, no invented weeks, pack tags or "you are here"
SUB(r'          <p class="week" aria-hidden="true" data-weekbig>Semaine 1</p>\n        </div>\n        <!-- CONFIRM: UNIL autumn semester start[^>]*-->\n      <div class="axis reveal" data-axis data-start="2026-09-14" data-weeks="14">.*?        <div class="band" style="--from:0;--to:.7">',
    '''          <p class="week" aria-hidden="true" data-weekbig>Comprendre plus vite</p>
        </div>
        <p class="sub semester__sub">Du premier cours aux examens, avance avec une direction claire, des supports déjà structurés et les bons outils au bon moment.</p>
      <div class="axis reveal" data-axis>
        <div class="axis__line"><span class="axis__draw"></span></div>
        <div class="band" style="--from:0;--to:.4">''')
R('''          <p>Tu sors du cours, tu ouvres HECPro et tu remets rapidement les choses au clair.</p>
          <span class="band__when">Semaines 1 à 14</span>
          <span class="pack-tag">Découverte</span>
        </div>
        <div class="band" style="--from:0;--to:1">''', '''          <p>Tu ne restes plus bloqué après un cours. Les notions sont reprises clairement pour que tu comprennes ce que tu fais et que tu puisses avancer.</p>
        </div>
        <div class="band" style="--from:.3;--to:.7">''')
R('''          <p>Plus besoin de chercher, trier et reconstruire tes propres supports. L’essentiel est déjà structuré pour toi.</p>
          <span class="band__when">Tout le semestre</span>
          <span class="pack-tag">Découverte et Elite</span>
        </div>
        <div class="band" style="--from:.55;--to:1">''', '''          <p>Plus besoin de passer des heures à chercher, trier et reconstruire tes propres supports. L’essentiel est déjà structuré pour toi.</p>
        </div>
        <div class="band" style="--from:.6;--to:1">''')
R('''          <p>Résumés, QCM, exercices, anciens examens et corrections vidéo&nbsp;: tu ne repars pas de zéro.</p>
          <span class="band__when">De la semaine 9 à la session</span>
          <span class="pack-tag pack-tag--elite">Elite</span>
        </div>''', '''          <p>Quand les examens approchent, tu ne repars pas de zéro. Tu sais déjà ce que tu maîtrises, ce qu’il reste à travailler et comment t’entraîner.</p>
        </div>''')

# ---- packs
R('<h2 id="packs-t" class="poster">Choisis ta formule.</h2>', '<h2 id="packs-t" class="poster">Commence HEC avec une longueur d’avance.</h2>\n        <p class="sub">7 matières, un cadre clair dès les premières semaines pour comprendre tes cours, savoir où tu vas et ne pas laisser le flou s’installer.</p>')
R('<legend>Je veux surtout</legend>', '<legend>Quel pack est fait pour moi&#8239;?</legend>')
R('<span>comprendre mes cours</span>', '<span>comprendre tes cours</span>')
R('<span>aller jusqu’aux examens</span>', '<span>aller plus loin</span>')
R('<p class="chooser__note" data-for="decouverte">Pour comprendre tes cours, prendre tes repères et arrêter d’avancer dans le flou, le Pack Découverte est fait pour ça.</p>',
  '<p class="chooser__note" data-for="decouverte">Si tu viens de commencer HEC et que tu veux surtout comprendre tes cours, prendre tes repères et arrêter d’avancer dans le flou, le Pack Découverte est fait pour ça.</p>')
R('<p class="chooser__note" data-for="elite">Pour disposer de tout le matériel et travailler la matière jusqu’aux examens, le Pack Elite regroupe l’expérience HECPro complète.</p>',
  '<p class="chooser__note" data-for="elite">Si tu veux aller plus loin et disposer de tout le matériel pour travailler la matière jusqu’aux examens, le Pack Elite regroupe l’expérience HECPro complète.</p>')
R('>Obtenir Découverte</a>', '>Obtenir le Pack Découverte</a>')
R('>Obtenir Elite</a>', '>Obtenir le Pack Elite</a>')
R('<p class="pack__flag">Le plus choisi</p>', '<p class="pack__flag">BESTSELLER</p>')
R('<p class="pack__incl">Tout le Pack Découverte, plus&nbsp;:</p>', '<p class="pack__incl">Le Pack Découverte complet est inclus</p>')
R('<use href="#i-check"/></svg>Guides orientés examen</li>', '<use href="#i-check"/></svg>Guides du semestre + guides orientés examen</li>')
R('<p class="packs__terms">Accès immédiat après paiement. Carte ou PayPal, Twint sur demande. Satisfait ou remboursé pendant 24&nbsp;h. Déjà plus de 150 étudiants HEC.</p>',
  '<p class="packs__terms">Accès immédiat · 7 matières · Satisfait ou remboursé sous 24h</p>')

# ---- coaching
R('Réserve une séance individuelle avec un assistant HECPro.</p>', 'Réserve une séance individuelle avec un assistant HECPro et va directement à ce qui te pose problème.</p>')
R('''        <div class="slip__foot">
          <p class="coaching__price"><span>45</span> CHF</p>''', '''        <p class="slip__ask">Besoin de débloquer quelque chose maintenant&#8239;?</p>
        <div class="slip__foot">
          <p class="coaching__price"><span>45</span> CHF</p>''')
R('<svg aria-hidden="true"><use href="#i-whatsapp"/></svg> Réserver sur WhatsApp</a>', '<svg aria-hidden="true"><use href="#i-whatsapp"/></svg> Réserver ma séance</a>')

# ---- avis: client heading and sub; excerpts are verbatim, cuts marked […]
R('<div class="wrap"><h2 id="avis-t" class="poster">Ce qu’en disent les étudiants.</h2></div>',
  '<div class="wrap"><h2 id="avis-t" class="poster">L’expérience HECPro, racontée par les étudiants.</h2>\n      <p class="sub">Des retours concrets sur le temps gagné, la clarté apportée et la différence ressentie tout au long du semestre.</p></div>')
Q = [('lemon', -4, 'Franchement, ça m’a évité de partir dans tous les sens. J’avais pas mal de retard en décembre et HECPro m’a permis de voir directement quoi prioriser pour les examens. Je recommande.', 'Léo', 'Étudiant en 1ère HEC'),
     ('white', 3, 'Les supports sont clairs et vont droit au but. Pas besoin de passer des heures à chercher quoi réviser, tout est beaucoup plus structuré.', 'Emma', 'Étudiante en 1ère HEC'),
     ('coral', -2, 'Ce que j’ai bien aimé au 1er semestre, c’est que ce n’est pas juste des résumés. Tu as aussi des QCM, des conseils et une vraie méthode pour bosser plus intelligemment. J’ai aussi bcp aimé les vidéos&nbsp;!', 'Nathan', 'Étudiant en 1ère HEC'),
     ('lilac', 5, 'Au début j’hésitais un peu à prendre HECPro, surtout pour le prix. Mais en vrai, ça m’a bien aidé. […] Clairement, ça m’a fait gagner du temps.', 'Fab', 'Redoublant en 1ère HEC'),
     ('teal', -3, '[…] J’ai pris le pack juste avant les révisions et ça m’a surtout évité de perdre du temps à chercher quoi travailler.', 'Manon', 'Étudiante en 1ère HEC'),
     ('mint', 2, 'J’ai beaucoup aimé travailler avec HECPro, ça m’a fait gagner énormément de temps. […] L’équipe a toujours été très réactive quand j’avais une question.', 'Christopher', 'Etudiant en 1ère HEC')]
new = '\n'.join(f'        <figure class="sticker sticker--{c}" style="--r:{r}deg"><blockquote><p>«&nbsp;{q}&nbsp;»</p></blockquote><figcaption><b>{n}</b> {role}</figcaption></figure>' for c, r, q, n, role in Q)
SUB(r'        <figure class="sticker sticker--lemon".*?</figure>\n(        <figure class="sticker.*?</figure>\n){5}', new + '\n')

# ---- FAQ
R('<h2 id="faq-t" class="poster">Questions fréquentes.</h2>', '<h2 id="faq-t" class="poster">FAQ - étudiants</h2>')
SUB(r'\n        <p class="sub">Une autre question&#8239;\? <a class="link-arrow" href="https://wa.link/ardcc6">Écris-nous sur WhatsApp <svg aria-hidden="true"><use href="#i-arrow"/></svg></a></p>', '')
R('résumés, QCM, exercices, anciens examens, corrections vidéo d’examens', 'résumés, qcms, exercices, anciens examens, corrections vidéo d’examens', 2)

# ---- closing, footer, dock
R('''      <h2 class="poster closing__title">Commence HEC avec une longueur d’avance.</h2>
      <p class="sub">7 matières, un cadre clair dès les premières semaines pour comprendre tes cours, savoir où tu vas et ne pas laisser le flou s’installer.</p>''',
  '      <h2 class="poster closing__title">Tu avances pendant que d’autres essaient encore de comprendre par où commencer.</h2>')
R('<p>Partenaires&nbsp;: Red Bull, Payot, Tony Mate</p>', '<p>Nos sponsors&nbsp;: Red Bull, Payot, Tony Mate</p>')
R('>Conditions générales de vente</a>', '>Conditions Générales de Vente</a>')
SUB(r'\n      <!-- CONFIRM: preferred spelling HECPro / HEC Pro \(the client uses both\) -->\n      <p><span class="copy">©</span> 2026 HEC Pro</p>', '')
R('<p>Dès <b>89 CHF</b></p>', '<p><b>Packs HECPro</b></p>')

open('index.html', 'w').write(h)
print('verbatim pass applied')
