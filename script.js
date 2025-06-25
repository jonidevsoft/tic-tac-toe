document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los elementos del DOM
    const boardEl = document.getElementById("board");
    const statusEl = document.getElementById("status");
    const difficultyEl = document.getElementById("dificultad");
    const modeEl = document.getElementById("mode");
    const startButton = document.getElementById("start-button");
    const resetButton = document.getElementById("reset-button");
    const difficultyControlGroup = document.getElementById("difficulty-control-group");

    // Referencias a los elementos de audio
    const soundClick = document.getElementById("soundClick");
    const soundWin = document.getElementById("soundWin");
    const soundDraw = document.getElementById("soundDraw");

    // Estado del juego
    let board = Array(9).fill(null);
    let currentPlayer = "X";
    let gameActive = false;
    let gameOver = false;

    // Estadísticas
    let stats = { wins: 0, losses: 0, draws: 0 };

    /**
     * Carga las estadísticas guardadas en localStorage.
     */
    function loadStats() {
        const savedStats = localStorage.getItem('tictactoeStats');
        if (savedStats) {
            try {
                stats = JSON.parse(savedStats);
            } catch (e) {
                console.error("Error al parsear las estadísticas guardadas:", e);
                stats = { wins: 0, losses: 0, draws: 0 }; // Reiniciar si hay error
            }
            updateStatsDisplay();
        }
    }

    /**
     * Guarda las estadísticas actuales en localStorage.
     */
    function saveStats() {
        localStorage.setItem('tictactoeStats', JSON.stringify(stats));
    }

    /**
     * Renderiza el tablero de juego creando o actualizando las celdas.
     */
    function renderBoard() {
        boardEl.innerHTML = ""; // Limpiar el tablero existente
        board.forEach((cellValue, i) => {
            const cellEl = document.createElement("div");
            cellEl.classList.add("cell");
            if (cellValue) {
                cellEl.classList.add("taken", `player-${cellValue.toLowerCase()}`);
                cellEl.textContent = cellValue;
            }
            cellEl.dataset.index = i; // Usar dataset para almacenar el índice
            cellEl.addEventListener('click', () => handleClick(i));
            boardEl.appendChild(cellEl);
        });
    }

    /**
     * Inicia un nuevo juego.
     */
    function startGame() {
        board = Array(9).fill(null);
        gameOver = false;
        gameActive = true;
        currentPlayer = "X"; // Siempre comienza X
        
        startButton.disabled = true;
        resetButton.disabled = false;
        
        statusEl.textContent = modeEl.value === "pvp" 
            ? "Turno de Jugador 1 (X)" 
            : "Tu turno (X)";
        
        renderBoard();
        // Asegurarse de quitar cualquier línea de victoria y animación del tablero anterior
        const existingWinLine = boardEl.querySelector('.win-line');
        if (existingWinLine) {
            existingWinLine.remove();
        }
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('win-animation');
        });
    }

    /**
     * Maneja el clic en una celda del tablero.
     * @param {number} i El índice de la celda clicada.
     */
    function handleClick(i) {
        if (!gameActive || board[i] !== null || gameOver) return;

        board[i] = currentPlayer;
        soundClick.play();
        renderBoard(); // Renderizar el tablero inmediatamente después del movimiento

        const winner = checkWinner(board);
        if (winner) {
            handleGameEnd(winner.player, winner.line);
            return;
        }

        if (board.every(cell => cell !== null)) { // Verificar empate
            handleGameEnd(null); // No hay ganador, es un empate
            return;
        }

        // Cambiar turno o ejecutar movimiento del bot
        if (modeEl.value === "bot") {
            if (currentPlayer === "X") {
                currentPlayer = "O";
                statusEl.textContent = "Turno de la Máquina...";
                // Retraso para que el movimiento del bot sea visible
                setTimeout(botMove, 800); 
            }
        } else {
            currentPlayer = currentPlayer === "X" ? "O" : "X";
            statusEl.textContent = `Turno de ${currentPlayer === "X" ? "Jugador 1 (X)" : "Jugador 2 (O)"}`;
        }
    }

    /**
     * Lógica para el movimiento del bot.
     */
    function botMove() {
        if (!gameActive || gameOver) return;
        
        const nivel = difficultyEl.value;
        let move;

        if (nivel === "easy") {
            move = easyBotMove();
        } else if (nivel === "medium") {
            move = mediumBotMove();
        } else { // Hard (Minimax)
            move = minimax(board, "O").index;
        }

        if (move !== null && board[move] === null) {
            board[move] = "O";
            soundClick.play();
            renderBoard();

            const winner = checkWinner(board);
            if (winner) {
                handleGameEnd(winner.player, winner.line);
                return;
            }
            
            if (board.every(cell => cell !== null)) { // Verificar empate después del movimiento del bot
                handleGameEnd(null);
                return;
            }

            currentPlayer = "X";
            statusEl.textContent = "Tu turno (X)";
        } else {
            // Si el bot no encuentra un movimiento válido (tablero lleno o error en lógica)
            // Esto debería ser raro con minimax y medium bot, pero puede pasar con easy si no hay espacios.
            if (board.every(cell => cell !== null)) {
                handleGameEnd(null); // Si el tablero está lleno, es un empate.
            } else {
                // En caso de un error inesperado, pasar el turno o reiniciar el juego.
                console.warn("Bot no pudo hacer un movimiento válido, pasando turno.");
                currentPlayer = "X";
                statusEl.textContent = "Tu turno (X)";
            }
        }
    }

    /**
     * Determina el movimiento del bot en dificultad fácil.
     * @returns {number | null} El índice de la celda para el movimiento o null si no hay espacios.
     */
    function easyBotMove() {
        const freeSpots = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (freeSpots.length > 0) {
            return freeSpots[Math.floor(Math.random() * freeSpots.length)];
        }
        return null;
    }

    /**
     * Determina el movimiento del bot en dificultad media.
     * Prioriza ganar, bloquear al jugador, tomar el centro y luego las esquinas.
     * @returns {number | null} El índice de la celda para el movimiento o null si no hay espacios.
     */
    function mediumBotMove() {
        // 1. Intenta ganar (para el bot 'O')
        for (let i = 0; i < board.length; i++) {
            if (board[i] === null) {
                board[i] = "O";
                if (checkWinner(board)) {
                    board[i] = null; // Deshacer movimiento
                    return i;
                }
                board[i] = null; // Deshacer movimiento
            }
        }

        // 2. Bloquea al jugador ('X') si está a punto de ganar
        for (let i = 0; i < board.length; i++) {
            if (board[i] === null) {
                board[i] = "X";
                if (checkWinner(board)) {
                    board[i] = null; // Deshacer movimiento
                    return i;
                }
                board[i] = null; // Deshacer movimiento
            }
        }

        // 3. Toma el centro si está disponible
        if (board[4] === null) return 4;

        // 4. Toma una esquina si está disponible
        const corners = [0, 2, 6, 8].filter(i => board[i] === null);
        if (corners.length > 0) {
            return corners[Math.floor(Math.random() * corners.length)];
        }

        // 5. Toma cualquier lado disponible (si no hay esquinas o centro)
        const sides = [1, 3, 5, 7].filter(i => board[i] === null);
        if (sides.length > 0) {
            return sides[Math.floor(Math.random() * sides.length)];
        }
        
        return null; // Si el tablero está lleno
    }

    /**
     * Implementación del algoritmo Minimax para la dificultad "Difícil".
     * Calcula la mejor jugada para el jugador actual.
     * @param {Array<string | null>} currentBoard El estado actual del tablero.
     * @param {string} player El jugador para el que se está calculando la jugada ('X' o 'O').
     * @returns {{score: number, index?: number}} El mejor movimiento con su puntuación.
     */
    function minimax(currentBoard, player) {
        const availableSpots = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null);

        const winner = checkWinner(currentBoard);
        if (winner && winner.player === "X") return { score: -10 }; // 'X' (jugador humano) es el minimizador
        if (winner && winner.player === "O") return { score: 10 };  // 'O' (bot) es el maximizador
        if (availableSpots.length === 0) return { score: 0 }; // Empate

        const moves = [];
        for (let i = 0; i < availableSpots.length; i++) {
            const move = {};
            move.index = availableSpots[i];
            currentBoard[availableSpots[i]] = player;

            if (player === "O") { // Si es el turno del bot (maximizador)
                const result = minimax(currentBoard, "X");
                move.score = result.score;
            } else { // Si es el turno del jugador (minimizador)
                const result = minimax(currentBoard, "O");
                move.score = result.score;
            }

            currentBoard[availableSpots[i]] = null; // Deshacer el movimiento
            moves.push(move);
        }

        let bestMove;
        if (player === "O") { // Bot buscando maximizar
            let bestScore = -Infinity;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score > bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        } else { // Humano buscando minimizar
            let bestScore = Infinity;
            for (let i = 0; i < moves.length; i++) {
                if (moves[i].score < bestScore) {
                    bestScore = moves[i].score;
                    bestMove = i;
                }
            }
        }
        return moves[bestMove];
    }

    /**
     * Verifica si hay un ganador en un tablero dado.
     * @param {Array<string | null>} boardToCheck El tablero a verificar.
     * @returns {{player: string, line: number[]} | null} El jugador ganador y la línea de victoria, o null.
     */
    function checkWinner(boardToCheck) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
            [0, 4, 8], [2, 4, 6]             // diagonales
        ];
        
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (boardToCheck[a] !== null && boardToCheck[a] === boardToCheck[b] && boardToCheck[a] === boardToCheck[c]) {
                return { player: boardToCheck[a], line: pattern };
            }
        }
        return null;
    }
    
    /**
     * Resalta la línea ganadora en el tablero con una animación.
     * @param {number[]} pattern El array de índices de la línea ganadora.
     */
    function highlightWinningLine(pattern) {
        const cells = document.querySelectorAll('.cell');
        pattern.forEach(index => {
            cells[index].classList.add('win-animation');
        });
        
        // Crear el elemento de la línea
        const lineEl = document.createElement('div');
        lineEl.classList.add('win-line');
        
        // Determinar el tipo de línea para aplicar la clase CSS correcta
        const [a, b, c] = pattern;
        let lineClass = '';

        if (a === 0 && b === 1 && c === 2) lineClass = 'horizontal-0';
        else if (a === 3 && b === 4 && c === 5) lineClass = 'horizontal-1';
        else if (a === 6 && b === 7 && c === 8) lineClass = 'horizontal-2';

        else if (a === 0 && b === 3 && c === 6) lineClass = 'vertical-0';
        else if (a === 1 && b === 4 && c === 7) lineClass = 'vertical-1';
        else if (a === 2 && b === 5 && c === 8) lineClass = 'vertical-2';

        else if (a === 0 && b === 4 && c === 8) lineClass = 'diagonal-1';
        else if (a === 2 && b === 4 && c === 6) lineClass = 'diagonal-2';

        if (lineClass) {
            lineEl.classList.add(lineClass);
            boardEl.appendChild(lineEl); // Añadir la línea directamente al contenedor del tablero
        }
    }

    /**
     * Maneja el final del juego (victoria o empate).
     * @param {string | null} winner El jugador ganador ('X', 'O') o null si es empate.
     * @param {number[]} [winLine=null] Los índices de la línea ganadora si existe.
     */
    function handleGameEnd(winner, winLine = null) {
        gameOver = true;
        gameActive = false;
        startButton.disabled = false; // Permitir iniciar un nuevo juego
        
        if (winner) {
            if (modeEl.value === "bot") {
                if (winner === "X") {
                    stats.wins++;
                    statusEl.textContent = "¡Has ganado!";
                } else {
                    stats.losses++;
                    statusEl.textContent = "¡La máquina gana!";
                }
            } else {
                statusEl.textContent = `¡Jugador ${winner} gana!`;
            }
            if (winLine) highlightWinningLine(winLine);
            soundWin.play();
        } else {
            stats.draws++;
            statusEl.textContent = "¡Empate!";
            soundDraw.play();
        }
        updateStatsDisplay();
        saveStats();
    }

    /**
     * Reinicia el juego a su estado inicial.
     */
    function resetGame() {
        board = Array(9).fill(null);
        gameOver = false;
        gameActive = false;
        currentPlayer = "X";
        
        startButton.disabled = false;
        resetButton.disabled = true;
        
        statusEl.textContent = "Selecciona un modo y haz clic en Iniciar";
        renderBoard();

        // Eliminar cualquier línea de victoria existente
        const existingWinLine = boardEl.querySelector('.win-line');
        if (existingWinLine) {
            existingWinLine.remove();
        }
        // Quitar la animación de las celdas
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('win-animation');
        });
    }

    /**
     * Actualiza la visualización de las estadísticas en el DOM.
     */
    function updateStatsDisplay() {
        document.getElementById("wins").textContent = stats.wins;
        document.getElementById("losses").textContent = stats.losses;
        document.getElementById("draws").textContent = stats.draws;
    }

    // --- Event Listeners y Inicialización ---

    // Cargar estadísticas y renderizar el tablero al cargar la página
    loadStats();
    renderBoard();
    
    // Asignar event listeners a los botones
    startButton.addEventListener('click', startGame);
    resetButton.addEventListener('click', resetGame);

    // Manejar el cambio de modo de juego para mostrar/ocultar la dificultad
    modeEl.addEventListener('change', () => {
        const isBotMode = modeEl.value === 'bot';
        difficultyControlGroup.style.display = isBotMode ? 'flex' : 'none';
        resetGame(); // Reiniciar el juego al cambiar el modo
    });
    
    // Inicializar la visualización de la dificultad al cargar la página
    const isBotModeInitial = modeEl.value === 'bot';
    difficultyControlGroup.style.display = isBotModeInitial ? 'flex' : 'none';
});