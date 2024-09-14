import Alpine from "alpinejs";
import persist from '@alpinejs/persist'

const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const hexchars = '0123456789abcdef';

Alpine.plugin(persist);

window.Alpine = Alpine;

document.addEventListener('alpine:init', () => {
  console.log('Alpine init');
  Alpine.store('theme', {
      value: 'system',

      init() {
          this.value = localStorage.getItem('theme') || 'system';
          // On page load, apply the appropriate theme
          this.applyTheme();

          // Watch for changes in system preference if the theme is 'system'
          this.watchSystemPreference();
      },

      switch(theme) {
          this.value = theme;  // Update theme value
          this.applyTheme();   // Apply the selected theme
          localStorage.setItem('theme', theme);
      },

      applyTheme() {
          if (this.value === 'system') {
              // Detect system preference (dark or light)
              const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
              document.documentElement.classList.toggle('dark', isDarkMode);
          } else {
              // Apply the manually selected theme ('light' or 'dark')
              document.documentElement.classList.toggle('dark', this.value === 'dark');
          }
      },

      watchSystemPreference() {
          // Watch for system preference changes (e.g., user switches from dark to light mode in OS)
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
              if (this.value === 'system') {
                  document.documentElement.classList.toggle('dark', e.matches);
              }
          });
      }
  });
});

Alpine.start();

// Entropy to bits per roll calculation based on dice count
const BITS_PER_ROLL = {
  1: Math.log2(Math.pow(6, 1)),
  2: Math.log2(Math.pow(6, 2)),
  3: Math.log2(Math.pow(6, 3)),
  4: Math.log2(Math.pow(6, 4)),
  5: Math.log2(Math.pow(6, 5)),
};

// Secure random dice roll generator using `crypto.getRandomValues()`
function secureRandomDiceRoll(diceCount, rollCount) {
  const diceRolls = [];

  for (let roll = 0; roll < rollCount; roll++) {
    const rollResults = [];
    const randomArray = new Uint32Array(diceCount);
    window.crypto.getRandomValues(randomArray);

    for (let i = 0; i < diceCount; i++) {
      const diceValue = (randomArray[i] % 6) + 1; // Generate a number between 1 and 6
      rollResults.push(diceValue);

      // Fill the corresponding input field
      document.getElementById(`dice-roll-${roll}-${i}`).value = diceValue;
    }

    diceRolls.push(rollResults);
  }

  return diceRolls;
}

// Calculate valid dice options for random string
export function updateDiceOptions() {
  const entropy = parseInt(document.getElementById('target-entropy').value);
  const diceCountSelect = document.getElementById('dice-count');

  // Clear previous options
  diceCountSelect.innerHTML = '';

  let closestOption = null;
  let closestRolls = Infinity;

  // Check dice options that result in <= 25 rolls
  Object.keys(BITS_PER_ROLL).forEach(diceCount => {
    const bitsPerRoll = BITS_PER_ROLL[diceCount];
    const requiredRolls = Math.ceil(entropy / bitsPerRoll);

    if (requiredRolls <= 25) {
      // This option is valid (does not exceed 25 rolls)
      const option = document.createElement('option');
      option.value = diceCount;
      option.text = `${diceCount} Dice (${requiredRolls} Rolls)`;
      diceCountSelect.appendChild(option);
    } else if (requiredRolls < closestRolls) {
      // Track the closest option if nothing is valid
      closestOption = diceCount;
      closestRolls = requiredRolls;
    }
  });

  // If no valid options, show the closest one (even if > 25 rolls)
  if (diceCountSelect.options.length === 0 && closestOption !== null) {
    const closestBitsPerRoll = BITS_PER_ROLL[closestOption];
    const requiredRolls = Math.ceil(entropy / closestBitsPerRoll);

    const option = document.createElement('option');
    option.value = closestOption;
    option.text = `${closestOption} Dice (${requiredRolls} Rolls)`;
    diceCountSelect.appendChild(option);
  }

  updateRollsBasedOnSelection(); // Update rolls after adjusting dice options
}

// Dynamically load the wordlist based on the number of dice (4 or 5)
async function loadWordlist(diceCount) {
  const wordlistUrl = diceCount === 4
    ? '/wordlists/eff_short_wordlist.txt'
    : '/wordlists/eff_large_wordlist.txt';

  const response = await fetch(wordlistUrl);
  const data = await response.text();

  const wordlist = {};
  data.split('\n').forEach(line => {
    const [roll, word] = line.trim().split(/\s+/);
    if (roll && word) {
      wordlist[roll] = word;
    }
  });

  return wordlist;
}

// Update the number of rolls based on the selected entropy or number of words
export function updateRollsBasedOnSelection() {
  const generationType = document.getElementById('generation-type').value;
  const diceCount = parseInt(document.getElementById('dice-count').value);
  const rollCountInput = document.getElementById('roll-count');

  if (generationType === 'random-string') {
    const entropy = parseInt(document.getElementById('target-entropy').value);
    const bitsPerRoll = BITS_PER_ROLL[diceCount];
    const requiredRolls = Math.ceil(entropy / bitsPerRoll);
    rollCountInput.value = requiredRolls; // Update the number of rolls
  } else if (generationType === 'passphrase') {
    const wordCount = parseInt(document.getElementById('word-count').value);
    rollCountInput.value = wordCount; // One roll per word
  }

  // Update dice roll input fields
  generateDiceRollInputs();
}

// Function to validate dice roll input and show error if invalid
function validateDiceInput(inputElement, nextInputId) {
  const value = parseInt(inputElement.value);
  if (isNaN(value) || value < 1 || value > 6) {
    inputElement.classList.add('border-b-red-500');
    inputElement.classList.add('border-b');
  } else {
    inputElement.classList.remove('border-b-red-500');
    inputElement.classList.remove('border-b');

    // Move to the next input if valid and nextInputId exists
    const nextInput = document.getElementById(nextInputId);
    if (nextInput) {
      nextInput.focus();
    }
  }
}

// Generate input fields for manual dice roll results (inline)
export function generateDiceRollInputs() {
  const diceCount = parseInt(document.getElementById('dice-count').value);
  const rollCount = parseInt(document.getElementById('roll-count').value);
  const diceRollsDiv = document.getElementById('dice-rolls');

  diceRollsDiv.innerHTML = ''; // Clear previous inputs
  setDiceRollsHeight();

  // Create input fields for manual dice rolls, displayed in a single line
  for (let roll = 0; roll < rollCount; roll++) {
    const rollDiv = document.createElement('div');
    rollDiv.classList = 'mb-4 flex flex-wrap items-center'; // Flexbox for single line

    const rollLabel = document.createElement('h4');
    rollLabel.classList = 'mr-4 font-semibold w-14'; // Margin right for spacing
    rollLabel.textContent = `Roll ${roll + 1}:`;

    rollDiv.appendChild(rollLabel);

    for (let i = 0; i < diceCount; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.classList = `p-2 w-12 text-center focus:outline-none bg-white dark:bg-gray-700 text-gray-900 border-t border-b border-gray-300 dark:text-gray-200 dark:border-gray-600 ${i === diceCount - 1 ? 'border-r' : ''} ${i === 0 ? 'border-l' : ''}`
      input.id = `dice-roll-${roll}-${i}`;
      input.placeholder = `${i + 1}`;

      // Add event listener for validation
      const nextInputId = `dice-roll-${i === diceCount - 1 ? roll + 1 : roll}-${i === diceCount - 1 ? 0 : i + 1}`;
      input.addEventListener('input', function () {
        validateDiceInput(this, nextInputId);
      });
      input.addEventListener('focus', function () {
        this.select();
      });

      rollDiv.appendChild(input);
    }
    diceRollsDiv.appendChild(rollDiv);
  }
}

// Convert dice rolls to EFF passphrase word
function diceRollsToWord(diceRolls, wordlist) {
  let rollKey = diceRolls.join('');
  return wordlist[rollKey] || '[Unknown Word]';
}

// Convert number to Base64 or Hex
function numberToFormat(number, format) {
  if (format === 'base64') {
    let firstChar = base64chars[Math.floor(number / 64)];
    let secondChar = base64chars[number % 64];
    return firstChar + secondChar;
  } else if (format === 'hex') {
    return hexchars[Math.floor(number / 16)] + hexchars[number % 16];
  }
  return '';
}

// Toggle input fields based on generation type (random string or passphrase)
export function toggleInputFields() {
  const generationType = document.getElementById('generation-type').value;
  const entropySelection = document.getElementById('entropy-selection');
  const wordSelection = document.getElementById('word-selection');
  const outputSection = document.getElementById('output-section');
  const output = document.getElementById("output");
  const outputHeader = document.getElementById("output-header");
  const outputFormat = document.getElementById("output-format-selection");

  output.innerHTML = '';
  outputSection.classList.add('hidden');

  if (generationType === 'passphrase') {
    entropySelection.classList.add('hidden');
    wordSelection.classList.remove('hidden');
    document.getElementById('dice-count').innerHTML = `
      <option value="4">4 Dice</option>
      <option value="5" selected>5 Dice (Recommended)</option>`;
    output.classList.add('break-normal');
    output.classList.remove('break-all');
    outputHeader.innerHTML = 'Selected Words';
    outputFormat.classList.add('hidden');
  } else {
    entropySelection.classList.remove('hidden');
    wordSelection.classList.add('hidden');
    output.classList.add('break-all');
    output.classList.remove('break-normal');
    outputHeader.innerHTML = 'Generated Random String';
    outputFormat.classList.remove('hidden');
    updateDiceOptions(); // Update the dice options based on entropy
  }

  // Update the number of rolls based on the selection
  updateRollsBasedOnSelection();
}


// Convert dice rolls to entropy bits and return as a Base64 or Hex string
function convertDiceRollsToRandomString(diceRolls, targetEntropy, outputFormat) {
  let binaryString = '';

  // Convert each roll result into its binary representation
  diceRolls.forEach(roll => {
    roll.forEach(diceValue => {
      const binary = (diceValue - 1).toString(2).padStart(3, '0'); // 3 bits for each dice (since 6 dice values = 2^3 = 8 possibilities)
      binaryString += binary;
    });
  });

  // Ensure we have exactly enough bits (targetEntropy) by trimming or adding more rolls
  binaryString = binaryString.slice(0, targetEntropy); // Slice to the target entropy bits

  // Convert the binary string into bytes
  const byteLength = Math.ceil(binaryString.length / 8);
  const byteArray = new Uint8Array(byteLength);

  for (let i = 0; i < byteLength; i++) {
    byteArray[i] = parseInt(binaryString.slice(i * 8, (i + 1) * 8), 2);
  }

  // Convert byte array to Base64 or Hex
  if (outputFormat === 'base64') {
    return btoa(String.fromCharCode.apply(null, byteArray)); // Base64 encoding
  } else if (outputFormat === 'hex') {
    return Array.from(byteArray)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(''); // Hex encoding
  }

  return '';
}

// Generate function for random string or passphrase
export async function generate() {
  const generationType = document.getElementById('generation-type').value;
  const diceCount = parseInt(document.getElementById('dice-count').value);
  const rollCount = parseInt(document.getElementById('roll-count').value);
  const outputSection = document.getElementById("output-section");
  const outputFormat = document.getElementById('output-format').value;
  const useVirtualDice = document.getElementById('use-virtual-dice').checked;
  const targetEntropy = parseInt(document.getElementById('target-entropy').value); // 128, 256, or 512 bits

  let output = '';
  let diceRolls = [];

  if (useVirtualDice) {
    // Roll virtual dice using secure random number generator
    diceRolls = secureRandomDiceRoll(diceCount, rollCount);
  } else {
    // Gather manual dice roll inputs
    for (let roll = 0; roll < rollCount; roll++) {
      const currentRoll = [];
      for (let i = 0; i < diceCount; i++) {
        const rollInput = document.getElementById(`dice-roll-${roll}-${i}`).value;
        const rollResult = parseInt(rollInput);
        if (rollResult < 1 || rollResult > 6 || isNaN(rollResult)) {
          alert('Please enter valid dice roll results between 1 and 6.');
          return;
        }
        currentRoll.push(rollResult);
      }
      diceRolls.push(currentRoll);
    }
  }

  outputSection.classList.remove('hidden');

  // Process dice rolls to generate the passphrase or random string
  if (document.getElementById('generation-type').value === 'passphrase') {
    const wordlist = await loadWordlist(diceCount);

    const words = diceRolls.map(roll => diceRollsToWord(roll, wordlist));

    document.getElementById('passphrase-output').classList.remove('hidden');
    document.getElementById('random-string-output').classList.add('hidden');

    // Display original passphrase words
    document.getElementById('passphrase-words').innerText = words.join(' ');

    // Format space-separated and hyphen-separated passphrases
    const spaceSeparated = words.join(' ');
    const hyphenSeparated = words.join('-');

    // Display in their respective sections
    document.getElementById('passphrase-space').innerText = spaceSeparated;
    document.getElementById('passphrase-hyphen').innerText = hyphenSeparated;

    // Clear random string output (to avoid mixing with passphrase)
    document.getElementById('output').innerText = '';
    document.getElementById('output').classList.add('hidden');
  } else {
    // Handle random string generation
    let randomString = convertDiceRollsToRandomString(diceRolls, targetEntropy, outputFormat);

    document.getElementById('passphrase-output').classList.add('hidden');
    document.getElementById('random-string-output').classList.remove('hidden');

    // Display the random string in the output field
    document.getElementById('output').classList.remove('hidden');
    document.getElementById('output').innerText = randomString;

    // Clear passphrase-specific fields (to avoid showing old passphrase content)
    document.getElementById('passphrase-words').innerText = '';
    document.getElementById('passphrase-space').innerText = '';
    document.getElementById('passphrase-hyphen').innerText = '';
  }

  setDiceRollsHeight();
}

// Function to copy text from the given element ID to the clipboard
export function copyToClipboard(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

// Function to set the height of the dice roll container equal to the form container
function setDiceRollsHeight() {
  const formContainer = document.querySelector('.form-container');
  const diceRollsContainer = document.querySelector('.dice-rolls-container');

  // Set dice roll container height equal to the form container's height
  diceRollsContainer.style.height = `${formContainer.offsetHeight}px`;
}

// Add event listener to adjust height on window resize
window.addEventListener('resize', setDiceRollsHeight);

// Call the function on page load to ensure correct height is set
window.addEventListener('load', setDiceRollsHeight);
