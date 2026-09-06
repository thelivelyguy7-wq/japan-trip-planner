document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('trip-form');
    const promptInput = document.getElementById('prompt');
    const submitBtn = document.getElementById('submit-btn');
    const btnSpinner = document.getElementById('btn-spinner');
    
    const statusContainer = document.getElementById('status-container');
    const statusList = document.getElementById('status-list');
    const resultsContainer = document.getElementById('results-container');

    const AGENT_MESSAGES = {
        'orchestrator': 'Destination Agent is picking points of interest...',
        'destination': 'Logistics Agent is mapping routes and transit...',
        'logistics': 'Budget Agent is calculating costs...',
        'budget': 'Synthesis Agent is writing the itinerary...',
        'synthesis': 'Review Agent (Gemini) is performing QA validation...',
        'review': 'QA Loop finished, compiling...'
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // Reset UI
        submitBtn.disabled = true;
        btnSpinner.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        statusContainer.classList.remove('hidden');
        statusList.innerHTML = '';

        // Show initial orchestrator status before stream starts
        handleStreamEvent({ node: 'start_orchestrator', msg: 'Orchestrator Agent is extracting constraints...' });

        try {
            // Initiate fetch stream
            const response = await fetch('/stream-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (!dataStr) continue;
                        
                        try {
                            const data = JSON.parse(dataStr);
                            handleStreamEvent(data);
                        } catch (err) {
                            console.error("Error parsing JSON chunk:", err);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate trip plan.');
            resetButton();
        }
    });

    let currentActiveItem = null;

    function handleStreamEvent(data) {
        if (data.node === 'complete') {
            resetButton();
            if (currentActiveItem) {
                markComplete(currentActiveItem);
            }
            renderResults(data.result);
            return;
        }

        let msg = '';
        if (data.node === 'start_orchestrator') {
            msg = data.msg;
        } else {
            msg = AGENT_MESSAGES[data.node] || `${data.node} finished processing...`;
        }

        // Mark previous as complete
        if (currentActiveItem) {
            markComplete(currentActiveItem);
        }

        // Create new active item
        const li = document.createElement('li');
        li.className = 'status-item active';
        li.innerHTML = `
            <div class="spinner status-spinner"></div>
            <span>${msg}</span>
        `;
        statusList.appendChild(li);
        currentActiveItem = li;
    }

    function markComplete(el) {
        el.classList.remove('active');
        el.classList.add('complete');
        el.querySelector('.spinner').remove();
        
        // Add a checkmark SVG
        const check = document.createElement('div');
        check.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        el.insertBefore(check, el.firstChild);
    }

    function resetButton() {
        submitBtn.disabled = false;
        btnSpinner.classList.add('hidden');
    }

    function renderResults(tripState) {
        resultsContainer.classList.remove('hidden');
        resultsContainer.classList.add('glass-panel');
        resultsContainer.style.animation = 'fadeIn 0.5s ease';

        const review = tripState.review_status;
        const draft = tripState.draft_itinerary;
        const constraints = tripState.constraints;

        let html = `<h2>Your Personalized Itinerary</h2>`;
        
        // Summary Card
        html += `
            <div class="summary-card">
                <h3>Trip Summary</h3>
                <p>${draft.summary || 'Enjoy your meticulously planned vacation!'}</p>
                <div class="cost-badge">Total Estimated Cost: $${draft.total_estimated_cost_usd} USD</div>
            </div>
        `;

        // Validation Warning if rejected but maxed out loops
        if (!review.is_approved) {
            html += `
                <div class="itinerary-day" style="border-color: var(--error);">
                    <h3 style="color: var(--error);">⚠️ AI Reviewer Note</h3>
                    <p>The AI wasn't able to perfectly meet your constraints after 3 attempts. You might need to adjust your budget or expectations.</p>
                    <p style="margin-top: 10px; font-size: 0.9em; color: var(--text-secondary);">Feedback: ${review.feedback.join(', ')}</p>
                </div>
            `;
        }

        // Day by Day
        if (draft.day_by_day) {
            for (const [day, details] of Object.entries(draft.day_by_day)) {
                html += `
                    <div class="itinerary-day">
                        <h3>${day.replace('_', ' ')}</h3>
                        <p>${details}</p>
                    </div>
                `;
            }
        }

        resultsContainer.innerHTML = html;
        
        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
