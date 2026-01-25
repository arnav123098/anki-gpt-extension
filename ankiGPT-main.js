setTimeout(() => {
    const buttonDiv = document.querySelector('div.flex.min-w-fit.items-center.gap-1\\.5.ps-0.pe-1\\.5');
    const button = document.createElement('button');
    button.textContent = 'Create flashcard';
    button.className = buttonDiv.querySelector('button')?.className || '';
    button.addEventListener('click', (e) => {
        e.preventDefault();
        getCard();
    });
    buttonDiv.appendChild(button);
    console.log('ankiGPT extension loaded');
}, 500);

const normalize = str => str.replace(/\s+/g, ' ').trim();

const INSTRUCTION = "I wanted some flashcards in this format: Q: question text (newline) A: answer text (two newlines) Do NOT add blank lines before or after separators. DO NOT include anything else in this response except this format.";

document.addEventListener('keydown', e => {
    if (e.key === '~' && e.shiftKey) {
        getCard();
    }
});

function getCard() {
    const textarea = document.querySelector('#prompt-textarea'); // textarea is actually a contentediable div
    const userPrompt = textarea.textContent;
    if (!userPrompt.trim()) return;
    const finalPrompt = INSTRUCTION + '\n\n' + userPrompt;
    textarea.textContent = finalPrompt;
    const sendButton = document.querySelector('#composer-submit-button');
    setTimeout(() => sendButton?.click(), 50);
    setTimeout(() => {
        const m = [...document.querySelectorAll('.whitespace-pre-wrap')];
        const lastM = m[m.length-1];
        if (lastM.textContent.includes(INSTRUCTION)) {
            lastM.textContent = lastM.textContent.slice(INSTRUCTION.length+1).trim();
        }
        let assistantBubbles;
        let lastText = '', currentText = '';
        const id = setInterval(() => {
            assistantBubbles = document.querySelectorAll('div[data-message-author-role="assistant"]');
            const lastBubble = assistantBubbles[assistantBubbles.length - 1];
            lastText = currentText
            currentText = lastBubble.innerText || '';
            if (lastText === currentText && currentText !== '') {
                clearInterval(id);
                sendCards();
            }
        }, 3000);
    
    }, 200);
}

async function sendCards() {
    const bubbles = document.querySelectorAll('div[data-message-author-role="assistant"]');
    const response = bubbles[bubbles.length - 1].innerText;
    console.log(response);
    const cards = createCards(response);
    console.log(cards);
    const DECK_NAME = prompt('Deck name: ');
    const MODEL_NAME = 'Basic';

    const notes = cards.map(c => ({
        'deckName': DECK_NAME,
        'modelName': MODEL_NAME,
        'fields': {
            'Front': c.q,
            'Back': c.a
        }
    }));
    
    const version = 6;

    const data = {
        action: 'addNotes',
        version: version,
        params: {
            notes: notes
        }
    };

    try {
        const response = await fetch('http://127.0.0.1:8765', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        });

        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.error) {
            console.error("AnkiConnect Error:", result.error);
            return;
        }

        console.log("Successfully added notes! IDs:", result.result);
  } catch (error) {
    console.error("Failed to connect to AnkiConnect or upload cards:", error);
    console.log("Ensure Anki is open and AnkiConnect is installed.");
  }
}

function createCards(response) {
    const cards = response.trim().split('\n\n').map(card => {
        const qaPair = card.trim().split('\n');
        let q = '', a = '';
        qaPair.forEach(line => {
            if (line.startsWith('Q: ')) q = line.replace('Q: ', '').trim();
            if (line.startsWith('A: ')) a = line.replace('A: ', '').trim();
        });
        return q && a ? {q: q, a: a} : null;
    }).filter(Boolean);

    return cards;
}

