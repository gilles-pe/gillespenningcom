import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { personalBookNote, personalNoteLayout } from '../src/book-note-layout.js';
const { books } = JSON.parse(readFileSync(new URL('../src/data/books.json', import.meta.url), 'utf8'));
const book = books.find(b => b.id === 'riding-the-waves-of-culture');
// Exact owner-approved wording: edits require a new explicit approval.
const approved = {
  "en": "An oldie but a goldie. I keep returning to this book to better understand and manage people across different cultures. Extremely valuable in business and private life. If you don't have time to read it, take a look at the diagrams.",
  "de": "Ein Klassiker, zu dem ich immer wieder zurückkehre, um Menschen unterschiedlicher Kulturen besser zu verstehen und zu führen. Extrem wertvoll im Berufs- wie im Privatleben. Wer keine Zeit zum Lesen hat, sollte sich zumindest die Diagramme anschauen."
};
for (const lang of ['en', 'de']) {
  assert.equal(book.personalNote[lang], approved[lang]);
  assert.equal(personalBookNote(book, lang), approved[lang]);
  // Portrait, square-ish upright and lying jackets; proportional fonts at actual texture sizes.
  for (const aspect of [2 / 3, .18 / .205, .11 / .17, .15 / .22, 1]) {
    const ctx = { font: '', measureText(text) {
      const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16);
      return { width: [...text].length * size * .56 };
    }};
    const layout = personalNoteLayout(ctx, book, lang, 768, Math.round(768 / aspect));
    assert.equal(layout.blocks.at(-1).lines.join(' '), approved[lang], 'every word retained');
    assert(layout.bottom <= layout.limit, 'no vertical clipping');
    assert(layout.bodyFontSize >= 24);
    for (const block of layout.blocks) {
      ctx.font = block.font;
      assert(block.lines.every(line => ctx.measureText(line).width <= 768 - 104), 'no horizontal clipping');
    }
  }
}
assert.equal(book.summary.en, "A classic guide to cross-cultural management, showing how cultural differences shape global business.");
assert.equal(new URL(book.amazonUrl).searchParams.get('tag'), 'aiinmedicine-21', 'owner-supplied affiliate tracking ID');
assert(new URL(book.amazonUrl).pathname.includes('/dp/1529346185'), 'owner-supplied book destination');
assert.deepEqual(book.placement, { anchor: 'writing-shelf-display-middle', orientation: 'upright', order: 4 });
const hail = books.find(b => b.id === 'project-hail-mary');
const hailApproved = {
  "en": "The movie is good, the book is fantastic. Science and emotion come together in a way a movie can never quite capture. A quick, smart and emotional read.",
  "de": "Der Film ist gut, das Buch fantastisch. Wissenschaft und Emotionen werden auf eine Weise verbunden, die ein Film nie ganz einfangen kann. Eine kurzweilige, kluge und emotionale Lektüre."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(hail, lang), hailApproved[lang], 'approved Project Hail Mary text');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, hail, lang, 768, Math.round(768 / (.15 / .22)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), hailApproved[lang], 'complete personal note');
  assert(layout.bottom <= layout.limit, 'personal note does not overlap the Amazon link');
}
const leviathan = books.find(b => b.id === 'leviathan-wakes');
const leviathanApproved = {
  "en": "The start of a series that rivals The Lord of the Rings. The first book starts slowly, but the story grows to incredible proportions with each book, while staying grounded in physics. Fantastic.",
  "de": "Der Auftakt zu einer Serie, die ein Rivale für Der Herr der Ringe ist. Das erste Buch startet langsam, doch die Geschichte wächst mit jedem Buch in unfassbare Dimensionen und bleibt dabei in der Physik verankert. Fantastisch."
};
for (const lang of ['en', 'de']) {
  assert.equal(personalBookNote(leviathan, lang), leviathanApproved[lang], 'approved Leviathan Wakes text');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, leviathan, lang, 768, Math.round(768 / (.16 / .23)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), leviathanApproved[lang], 'complete personal note');
  assert(layout.bottom <= layout.limit, 'note must not overlap the Amazon link');
}
assert.equal(new URL(leviathan.amazonUrl).searchParams.get('tag'), 'aiinmedicine-21');
assert(new URL(leviathan.amazonUrl).pathname.includes('/dp/B004XCGKYQ'));
const kahneman = books.find(b => b.id === 'thinking-fast-and-slow');
const kahnemanApproved = {
  "en": "Everyone talks about it. Hardly anyone finishes it. I fought my way through it and, in the years since, have kept returning to it in certain situations. It was worth it.",
  "de": "Alle reden darüber. Kaum jemand liest es zu Ende. Ich habe mich durchgekämpft und bin in den Jahren danach in bestimmten Situationen immer wieder darauf zurückgekommen. Es war es wert."
};
for (const lang of ['en', 'de']) {
  assert.equal(personalBookNote(kahneman, lang), kahnemanApproved[lang], 'approved Thinking, Fast and Slow text');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, kahneman, lang, 768, Math.round(768 / (.18 / .205)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), kahnemanApproved[lang], 'complete personal note');
  assert(layout.bottom <= layout.limit, 'note must fit on the back');
}
const sapiens = books.find(b => b.id === 'sapiens');
const sapiensApproved = {
  "en": "This book made Harari famous, and for good reason. It combines a broad historical view with a fresh perspective on human development and how the stories we share shape societies.",
  "de": "Dieses Buch machte Harari berühmt - und das zu Recht. Es verbindet einen breiten Blick auf die Geschichte mit einer neuen Perspektive auf die Entwicklung der Menschheit und darauf, wie gemeinsame Geschichten Gesellschaften prägen."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(sapiens, lang), sapiensApproved[lang], 'approved Sapiens note');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, sapiens, lang, 768, Math.round(768 / (.18 / .23)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), sapiensApproved[lang]);
  assert(layout.bottom <= layout.limit, 'note must fit on back');
}
const weird = books.find(b => b.id === 'the-weirdest-people');
const weirdApproved = {
  "en": "I love this book, even though it’s a difficult read. Its scientific and historical detail is extraordinary. It’s one of those rare books that are very hard to finish, yet I love every line of it. If you’re interested in history and want to understand society and progress, go for it.",
  "de": "Ich liebe dieses Buch, auch wenn es schwer zu lesen ist. Sein wissenschaftlicher und historischer Detailreichtum ist außergewöhnlich. Es gehört zu den seltenen Büchern, die sehr schwer zu Ende zu lesen sind und bei denen ich gleichzeitig jede Zeile liebe. Wer sich für Geschichte interessiert und Gesellschaft und Fortschritt verstehen möchte, sollte es lesen."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(weird, lang), weirdApproved[lang], 'approved WEIRDest note');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, weird, lang, 768, Math.round(768 / (.18 / .205)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), weirdApproved[lang]);
  assert(layout.bottom <= layout.limit, 'note must fit on back');
}
const factfulness = books.find(b => b.id === 'factfulness');
const factfulnessApproved = {
  "en": "A little book that is not nearly famous enough. It offers a sober perspective and encourages us to think more in facts and less in emotions or historical assumptions. Kudos to Hans Rosling for recognizing this and trying to change it with this book.",
  "de": "Ein kleines Buch, das nicht bekannt genug ist. Es bietet eine nüchterne Perspektive und ermutigt uns, mehr in Fakten und weniger in Emotionen oder historischen Annahmen zu denken. Respekt an Hans Rosling, der dies erkannt hat und mit diesem Buch etwas verändern wollte."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(factfulness, lang), factfulnessApproved[lang], 'approved Factfulness note');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, factfulness, lang, 768, Math.round(768 / (.18 / .23)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), factfulnessApproved[lang]);
  assert(layout.bottom <= layout.limit, 'note must fit on back');
}
const eve = books.find(b => b.id === 'eve');
const eveApproved = {
  "en": "Women’s health and how medicine is shaped by gender bias receive far too little attention. Combined with a historical and biological perspective, this makes for a great read. There is a lot to learn from this book.",
  "de": "Frauengesundheit und die Frage, wie geschlechtsspezifische Vorurteile die Medizin prägen, bekommen viel zu wenig Aufmerksamkeit. In Verbindung mit einer historischen und biologischen Perspektive macht das dieses Buch zu einer großartigen Lektüre. Es gibt viel daraus zu lernen."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(eve, lang), eveApproved[lang], 'approved Eve note');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, eve, lang, 768, Math.round(768 / (.13 / .19)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), eveApproved[lang]);
  assert(layout.bottom <= layout.limit, 'note must fit above the Amazon link');
}
assert(new URL(eve.amazonUrl).pathname.includes('/dp/B0BRMSFDJW'));
assert.equal(new URL(eve.amazonUrl).searchParams.get('tag'), 'aiinmedicine-21');
const tuberculosis = books.find(b => b.id === 'everything-is-tuberculosis');
const tuberculosisApproved = {
  "en": "The impact of tuberculosis on health and history is heavily underrated in the Western world. This book takes us through its past and present and offers insights into other diseases we have yet to conquer.",
  "de": "Der Einfluss der Tuberkulose auf Gesundheit und Geschichte wird in der westlichen Welt stark unterschätzt. Das Buch führt durch ihre Vergangenheit und Gegenwart und liefert Denkanstöße für andere Krankheiten, die wir noch besiegen müssen."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(tuberculosis, lang), tuberculosisApproved[lang], 'approved Everything Is Tuberculosis note');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, tuberculosis, lang, 768, Math.round(768 / (.13 / .19)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), tuberculosisApproved[lang]);
  assert(layout.bottom <= layout.limit, 'note must fit above Amazon link');
}
assert.equal(tuberculosis.amazonUrl, 'https://link.amazon/B07X6F5sT');
const hardSell = books.find(b => b.id === 'the-hard-sell');
const hardSellApproved = {
  "en": "Crime and Punishment at an Opioid Startup - this book is about ethics, health and selling. A little like Predictably Irrational, it shows the pitfalls that can come with success.",
  "de": "Crime and Punishment at an Opioid Startup - dieses Buch handelt von Ethik, Gesundheit und Verkauf. Ähnlich wie Predictably Irrational zeigt es die Fallstricke, die mit Erfolg einhergehen können."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(hardSell, lang), hardSellApproved[lang], 'approved The Hard Sell note');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, hardSell, lang, 768, Math.round(768 / (.124 / .19)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), hardSellApproved[lang]);
  assert(layout.bottom <= layout.limit, 'note must fit above Amazon link');
}
assert(new URL(hardSell.amazonUrl).pathname.includes('/dp/B0B96F2CSQ'));
assert.equal(new URL(hardSell.amazonUrl).searchParams.get('tag'), 'aiinmedicine-21');
const fortress = books.find(b => b.id === 'the-fortress');
const fortressApproved = {
  "en": "A special book for anyone interested in history. The siege of Przemyśl was one of the great battles of the 20th century, yet it has largely faded from view. It already contained the horrors that would shape the decades to come: industrial warfare, antisemitism and clashes between European powers. A book about the past that also helps us recognize signs in the present.",
  "de": "Ein besonderes Buch für alle, die sich für Geschichte interessieren. Die Belagerung von Przemyśl war eine der großen Schlachten des 20. Jahrhunderts und ist dennoch weitgehend in Vergessenheit geraten. Sie enthielt bereits die Schrecken der kommenden Jahrzehnte: industrialisierte Kriegsführung, Antisemitismus und den Zusammenstoß europäischer Mächte. Ein Buch über die Vergangenheit, das auch hilft, Zeichen in der Gegenwart zu erkennen."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(fortress, lang), fortressApproved[lang], 'approved The Fortress note');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, fortress, lang, 768, Math.round(768 / (.17 / .23)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), fortressApproved[lang]);
  assert(layout.bottom <= layout.limit, 'note must fit above Amazon link');
}
assert(new URL(fortress.amazonUrl).pathname.includes('/dp/B07PLMJN9Y'));
assert.equal(new URL(fortress.amazonUrl).searchParams.get('tag'), 'aiinmedicine-21');
// Additional owner-supplied notes already present in the catalog.
const additionalApprovedNotes = {
  "prisoners-of-geography": {
    "en": "A great, easy read that is highly insightful. Each chapter stands on its own. It shows how geography still helps shape the behavior of countries like the US and Russia - and why mountains and rivers have given Africa and Europe different paths of development.",
    "de": "Ein tolles, leicht lesbares und hochinteressantes Buch. Jedes Kapitel steht für sich. Es zeigt, wie Geografie das heutige Verhalten von Ländern wie den USA und Russland mitprägt - und warum Berge und Flüsse Afrika und Europa unterschiedliche Entwicklungsmöglichkeiten gegeben haben."
  },
  "the-moral-animal": {
    "en": "A classic in behavioral science, offering insights into our psychology and what we may have inherited through evolution. Controversial, but with a lot of food for thought.",
    "de": "Ein Klassiker der Verhaltensforschung, der Einblicke in unsere Psyche und unser evolutionäres Erbe bietet."
  },
  "the-body": {
    "en": "All books by Bill Bryson are delightful. This one gives wonderful insights into how our body works and offers great anecdotes from the history of medical science.",
    "de": "Alle Bücher von Bill Bryson sind ein Vergnügen. Dieses hier gibt wunderbare Einblicke darin, wie unser Körper funktioniert, und erzählt großartige Anekdoten aus der Geschichte der Medizin."
  },
  "the-last-unicorn": {
    "en": "You may know the movie, but the book has a very special language. Whether the unicorn is running “with the speed of life” or the most frightening monster in the travelling carnival is old age - a scene not in the movie - the book instills a feeling of wonder.",
    "de": "Du kennst vielleicht den Film, aber das Buch hat eine ganz besondere Sprache. Ob das Einhorn „with the speed of life“ läuft oder das Alter das schrecklichste Monster des reisenden Jahrmarkts ist - eine Szene, die im Film fehlt: Das Buch vermittelt ein Gefühl des Staunens."
  },
  "autocracy-inc": {
    "en": "Like Timothy Snyder, Anne Applebaum makes a compelling case that historians may be our best guides to the future. Sadly, what she described in this book in 2024 is already making headlines and will be breaking news for years to come.",
    "de": "Wie Timothy Snyder zeigt auch Anne Applebaum, dass Historiker vielleicht unsere besten Wegweiser für die Zukunft sind. Leider bestimmt das, was sie 2024 in diesem Buch beschrieben hat, bereits heute unsere Nachrichten - und wird es wohl noch über Jahre tun."
  },
  "red-plenty": {
    "en": "We take capitalism for granted. This book offers a fascinating look from inside the Soviet Union at a different path - and how misaligned incentives and growing complexity made it impossible to sustain over the decades.",
    "de": "Wir nehmen den Kapitalismus als gegeben hin. Dieses Buch bietet einen faszinierenden Blick aus dem Inneren der Sowjetunion auf einen anderen Weg - und darauf, wie falsche Anreize und wachsende Komplexität ihn über Jahrzehnte scheitern ließen."
  },
  "a-very-short-history-of-life-on-earth": {
    "en": "It is hard to grasp the sheer length of life’s history on Earth. Even dinosaurs and the ice ages are just a glimpse of it. This book takes us through ancient forests, strange creatures and mass extinctions - and reminds us that we are only the latest species to have a moment in the spotlight.",
    "de": "Die Länge der Geschichte des Lebens auf der Erde ist kaum zu begreifen. Selbst Dinosaurier und Eiszeiten sind nur ein kleiner Ausschnitt. Dieses Buch führt durch urzeitliche Wälder, seltsame Lebewesen und Massenaussterben - und erinnert uns daran, dass wir nur die jüngste Art sind, die für einen Moment im Rampenlicht steht."
  },
  "the-wandering-earth": {
    "en": "A collection of short stories written in a language quite different from what we are used to. Some explore truly new ideas. My personal favorite: “How to Climb a Mountain.”",
    "de": "Eine Sammlung von Kurzgeschichten in einer Sprache, die sich deutlich von dem unterscheidet, was wir gewohnt sind. Einige erzählen von ganz neuen Ideen. Mein persönlicher Favorit: „How to Climb a Mountain“."
  },
  "the-master-and-margarita": {
    "en": "A timeless classic with dense language that explores good and evil. Maybe not everyone’s cup of tea.",
    "de": "Ein zeitloser Klassiker, der in dichter Sprache Gut und Böse erkundet. Vielleicht nicht jedermanns Sache."
  },
  "fathers-and-sons": {
    "en": "A little book written almost 170 years ago, set in a time of change as society moved from agriculture towards industry. It offers insight into how people behave in such times and how the actions of one generation can echo into the next. It makes you wonder what we are setting in motion today.",
    "de": "Ein kleines Buch, vor fast 170 Jahren geschrieben, in einer Zeit des Wandels von der Agrar- zur Industriegesellschaft. Es zeigt, wie Menschen sich in solchen Zeiten verhalten und wie die Handlungen einer Generation bis in die nächste nachwirken. Es lässt einen fragen, was wir heute in Gang setzen."
  },
  "the-wright-brothers": {
    "en": "Highly recommended. The story of two decent, hardworking young men from a bicycle shop in Ohio who invented flight is a real page-turner. With determination and belief in their own abilities, they succeeded while scientific societies, nations and militaries were racing towards the same goal. It is hard to believe this is a true story.",
    "de": "Sehr empfehlenswert. Die Geschichte zweier fleißiger, anständiger junger Männer aus einer Fahrradwerkstatt in Ohio, die das Fliegen erfanden, liest sich wie ein Roman. Mit Entschlossenheit und Vertrauen in ihre Fähigkeiten schafften sie es, während wissenschaftliche Gesellschaften, Staaten und Militärs um dasselbe Ziel rangen. Kaum zu glauben, dass diese Geschichte wahr ist."
  },
  "bloodlands": {
    "en": "I started reading Timothy Snyder in 2008. Bloodlands was a great guide to the history of the lands caught between Germany and Russia. History is not disconnected from the present: patterns repeat, and this book helps explain a region more important today than at any point in the last 30 years. Snyder is now a world-renowned historian and, alongside Anne Applebaum, one of the most insightful voices explaining contemporary politics.",
    "de": "Ich begann 2008, Timothy Snyder zu lesen. Bloodlands war ein großartiger Wegweiser durch die Geschichte der Länder zwischen Deutschland und Russland. Geschichte ist nicht von der Gegenwart getrennt: Muster wiederholen sich, und dieses Buch hilft, eine Region zu verstehen, die heute wichtiger ist als je zuvor in den vergangenen 30 Jahren. Snyder ist inzwischen ein weltweit bekannter Historiker und neben Anne Applebaum eine der aufschlussreichsten Stimmen zur aktuellen Politik."
  },
  "guns-germs-and-steel": {
    "en": "A book that challenges our assumptions about superiority. How could a small group of Spanish conquistadors defeat far larger Indigenous civilizations? Why did so many domesticated animals originate in one region? And how did the orientation of continents shape the spread of ideas and agriculture? One fascinating perspective on the history of humankind.",
    "de": "Ein Buch, das unsere Vorstellungen von Überlegenheit hinterfragt. Wie konnte eine kleine Gruppe spanischer Eroberer wesentlich größere indigene Zivilisationen besiegen? Warum stammen so viele Nutztiere aus einer Region? Und wie beeinflusste die Ausrichtung der Kontinente die Verbreitung von Ideen und Landwirtschaft? Eine faszinierende Perspektive auf die Geschichte der Menschheit."
  },
  "predictably-irrational": {
    "en": "A classic of the genre, although some of its research has been challenged. After reading it, I better understood things I had observed while managing people. It helped me think about incentives and how to adapt systems to avoid unintended behavior.",
    "de": "Ein Klassiker auf seinem Gebiet, auch wenn einige Forschungsergebnisse inzwischen hinterfragt werden. Nach der Lektüre habe ich vieles besser verstanden, was ich im Umgang mit meinen Teams beobachtet hatte. Das Buch hat mir geholfen, Anreize besser zu gestalten und Systeme so anzupassen, dass sie unerwünschtes Verhalten vermeiden helfen."
  },
  "the-innovators-dilemma": {
    "en": "A classic of the genre, perhaps more relevant than ever in times of groundbreaking innovation and economic turmoil. When companies like Nokia or Volkswagen struggle, we often look for someone or something to blame. This book helps us understand the deeper dynamics that can stifle innovation.",
    "de": "Ein Klassiker seines Fachs, vielleicht heute wichtiger denn je: Wir erleben bahnbrechende Innovationen und wirtschaftliche Umbrüche. Wenn Unternehmen wie Nokia oder Volkswagen ins Straucheln geraten, suchen wir oft nach einem Schuldigen. Dieses Buch hilft, die tieferliegenden Dynamiken zu verstehen, die Innovation behindern."
  },
  "we-are-legion-we-are-bob": {
    "en": "Just fun science fiction built around the idea of a conscious von Neumann machine. Sometimes quite funny, with the lingering question of how much of this could actually be possible.",
    "de": "Einfach unterhaltsame Science-Fiction rund um die Idee einer bewussten Von-Neumann-Maschine. Manchmal ziemlich lustig - und mit der Frage im Hinterkopf, wie viel davon tatsächlich möglich sein könnte."
  }
};
for (const [id, notes] of Object.entries(additionalApprovedNotes)) {
  const b = books.find(book => book.id === id);
  assert(b, id + ' exists');
  for (const lang of ['en', 'de']) {
    assert.equal(personalBookNote(b, lang), notes[lang], id + ' approved text');
    const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
    for (const aspect of [.16 / .27, .19 / .21]) {
      const layout = personalNoteLayout(ctx, b, lang, 768, Math.round(768 / aspect));
      assert.equal(layout.blocks.at(-1).lines.join(' '), notes[lang], id + ' complete text');
      assert(layout.bottom <= layout.limit, id + ' fits');
    }
  }
}
for (const b of books.filter(b => b.id !== book.id && b.id !== hail.id && b.id !== leviathan.id && b.id !== kahneman.id && b.id !== sapiens.id && b.id !== weird.id && b.id !== factfulness.id && b.id !== eve.id && b.id !== tuberculosis.id && b.id !== hardSell.id && b.id !== fortress.id && !(b.id in additionalApprovedNotes))) {
  assert.equal(personalBookNote(b, 'en'), null, b.id);
  assert.equal(personalBookNote(b, 'de'), null, b.id);
}
assert.equal(personalBookNote({ personalNote: { en: 'Approved English only' } }, 'de'), null, 'no invented translation or language fallback');
console.log('Personal book notes: exact approved EN/DE, separate summary, complete wrapping, missing-note fallback: passed');

for (const [id, asin] of Object.entries({ 'thinking-fast-and-slow':'B00555X8OA', 'sapiens':'B00ICN066A', 'the-weirdest-people':'B07RZFCPMD' })) {
  const url = new URL(books.find(b => b.id === id).amazonUrl);
  assert(url.pathname.includes('/dp/' + asin)); assert.equal(url.searchParams.get('tag'), 'aiinmedicine-21');
}

for (const [id, asin] of Object.entries({"red-plenty":"B0044DEFSC","a-very-short-history-of-life-on-earth":"B08ZNLMCX5","the-wandering-earth":"B0BPCQHNDB","the-master-and-margarita":"B0FV27MJYK","we-are-legion-we-are-bob":"B01LWAESYQ","fathers-and-sons":"B005RBUKK2","the-wright-brothers":"B00LD1RWP6","bloodlands":"B005G37SBK","guns-germs-and-steel":"B06X1CT33R","predictably-irrational":"B002RI9QJE","the-innovators-dilemma":"B012BLTM6I"})) {
  const url = new URL(books.find(b => b.id === id).amazonUrl);
  assert(url.pathname.includes('/dp/' + asin), id + ' supplied destination');
  assert.equal(url.searchParams.get('tag'), 'aiinmedicine-21', id + ' affiliate tag');
}
