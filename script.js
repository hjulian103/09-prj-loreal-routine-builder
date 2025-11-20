/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Array to track selected products */
let selectedProducts = [];

/* LocalStorage key for selected products */
const SELECTED_PRODUCTS_KEY = "loreal-selected-products";

/* Clear search function */
function clearSearch() {
  productSearch.value = "";
  filterAndDisplayProducts();
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  try {
    localStorage.setItem(
      SELECTED_PRODUCTS_KEY,
      JSON.stringify(selectedProducts)
    );
  } catch (error) {
    console.error("Error saving selected products:", error);
  }
}

/* Load selected products from localStorage */
function loadSelectedProducts() {
  try {
    const saved = localStorage.getItem(SELECTED_PRODUCTS_KEY);
    if (saved) {
      selectedProducts = JSON.parse(saved);
    }
  } catch (error) {
    console.error("Error loading selected products:", error);
    selectedProducts = [];
  }
}

/* Clear all selected products */
function clearAllSelections() {
  selectedProducts = [];
  saveSelectedProducts();
  updateSelectedProductsDisplay();
  updateProductCardsSelection();

  /* Show confirmation message */
  displayMessage("All product selections have been cleared!", "assistant");
}

/* Validate and clean up selected products against current product data */
function validateSelectedProducts() {
  if (selectedProducts.length === 0) return;

  const validProducts = selectedProducts.filter((selectedProduct) =>
    allProducts.some((product) => product.id === selectedProduct.id)
  );

  /* Update if any products were invalid */
  if (validProducts.length !== selectedProducts.length) {
    selectedProducts = validProducts;
    saveSelectedProducts();
    console.log("Cleaned up invalid product selections");
  }
}

/* Global products array for chat recommendations */
let allProducts = [];

/* Conversation history for context-aware responses */
let conversationHistory = [];

/* Generated routine content for follow-up questions */
let generatedRoutine = null;

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  /* Clear container and add loading state */
  productsContainer.innerHTML = "";
  productsContainer.classList.add("loading-products");

  /* Create product cards */
  const productCards = products.map((product, index) => {
    /* Check if this product is already selected */
    const isSelected = selectedProducts.some(
      (selected) => selected.id === product.id
    );
    const selectedClass = isSelected ? " selected" : "";

    return `
    <div class="product-card${selectedClass}" data-product-id="${
      product.id
    }" data-product-index="${index}" tabindex="0" role="button" aria-label="Select ${
      product.name
    } by ${product.brand}" style="opacity: 0; transform: translateY(20px);">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="description-overlay">
        <div class="description-content">
          <h4>${product.name}</h4>
          <p class="brand">${product.brand}</p>
          <p class="description">${product.description}</p>
        </div>
      </div>
      ${
        isSelected
          ? '<div class="selection-indicator"><i class="fa-solid fa-check"></i></div>'
          : ""
      }
    </div>
  `;
  });

  /* Add cards to container */
  productsContainer.innerHTML = productCards.join("");
  productsContainer.classList.remove("loading-products");

  /* Animate cards in */
  const cards = productsContainer.querySelectorAll(".product-card");
  anime({
    targets: cards,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 500,
    delay: anime.stagger(50),
    easing: "easeOutQuart",
  });

  /* Add click event listeners to product cards */
  addProductCardListeners();
}

/* Combined filtering function for search and category */
async function filterAndDisplayProducts() {
  const products = await loadProducts();

  /* Update global products array */
  allProducts = products;

  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearch.value.toLowerCase().trim();

  let productsToDisplay = products;

  /* Apply category filter */
  if (selectedCategory && selectedCategory !== "all") {
    productsToDisplay = productsToDisplay.filter(
      (product) => product.category === selectedCategory
    );
  }

  /* Apply search filter */
  if (searchTerm) {
    productsToDisplay = productsToDisplay.filter((product) => {
      const productName = product.name.toLowerCase();
      const productBrand = product.brand.toLowerCase();
      const productDescription = product.description.toLowerCase();
      const productCategory = product.category.toLowerCase();

      return (
        productName.includes(searchTerm) ||
        productBrand.includes(searchTerm) ||
        productDescription.includes(searchTerm) ||
        productCategory.includes(searchTerm)
      );
    });
  }

  displayProducts(productsToDisplay);

  /* Add event listeners after a short delay to ensure DOM is ready */
  setTimeout(() => {
    addProductCardListeners();
    /* Ensure selection states are synced */
    updateProductCardsSelection();
  }, 100);

  /* Show results count */
  showSearchResults(productsToDisplay.length, products.length, searchTerm);
}

/* Show search results information */
function showSearchResults(filteredCount, totalCount, searchTerm) {
  const existingResults = document.querySelector(".search-results");
  if (existingResults) {
    existingResults.remove();
  }

  if (searchTerm || categoryFilter.value !== "all") {
    const resultsDiv = document.createElement("div");
    resultsDiv.className = "search-results";

    let message = `Showing ${filteredCount} of ${totalCount} products`;
    if (searchTerm) {
      message += ` for "${searchTerm}"`;
    }
    if (categoryFilter.value !== "all") {
      const categoryText =
        categoryFilter.options[categoryFilter.selectedIndex].text;
      message += ` in ${categoryText}`;
    }

    resultsDiv.innerHTML = `<p><i class="fa-solid fa-filter"></i> ${message}</p>`;
    productsContainer.parentNode.insertBefore(resultsDiv, productsContainer);
  }
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", filterAndDisplayProducts);

/* Filter and display products when search input changes */
productSearch.addEventListener("input", () => {
  /* Debounce search to avoid too many calls */
  clearTimeout(productSearch.searchTimeout);
  productSearch.searchTimeout = setTimeout(filterAndDisplayProducts, 300);
});

/* Event handlers for product selection */
function handleProductClick(e) {
  const card = e.target.closest(".product-card");
  if (!card) return;

  e.preventDefault();
  e.stopPropagation();

  const productId = parseInt(card.dataset.productId);
  const product = allProducts.find((p) => p.id === productId);

  if (product) {
    toggleProductSelection(product);
  }
}

function handleProductKeydown(e) {
  if (e.key !== "Enter" && e.key !== " ") return;

  const card = e.target.closest(".product-card");
  if (!card) return;

  e.preventDefault();
  e.stopPropagation();

  const productId = parseInt(card.dataset.productId);
  const product = allProducts.find((p) => p.id === productId);

  if (product) {
    toggleProductSelection(product);
  }
}

/* Track if event listeners have been added */
let eventListenersAdded = false;

/* Add click event listeners to product cards using event delegation */
function addProductCardListeners() {
  /* Only add event listeners once */
  if (eventListenersAdded) return;

  /* Add event listeners using delegation */
  productsContainer.addEventListener("click", handleProductClick);
  productsContainer.addEventListener("keydown", handleProductKeydown);

  eventListenersAdded = true;
}

/* Toggle product selection state */
function toggleProductSelection(product) {
  const existingIndex = selectedProducts.findIndex(
    (selected) => selected.id === product.id
  );

  /* Find the product card for animation */
  const productCard = document.querySelector(
    `[data-product-id="${product.id}"]`
  );

  if (existingIndex > -1) {
    /* Product is already selected, remove it with animation */
    selectedProducts.splice(existingIndex, 1);

    if (productCard) {
      anime({
        targets: productCard,
        scale: [1, 0.95, 1],
        backgroundColor: ["#fff", "#ffebee", "#fff"],
        duration: 300,
        easing: "easeOutQuart",
      });
    }
  } else {
    /* Product not selected, add it with animation */
    selectedProducts.push(product);

    if (productCard) {
      anime({
        targets: productCard,
        scale: [1, 1.05, 1],
        backgroundColor: ["#fff", "#e8f5e8", "#fff"],
        duration: 400,
        easing: "easeOutBack",
      });

      /* Animate selection indicator */
      setTimeout(() => {
        const indicator = productCard.querySelector(".selection-indicator");
        if (indicator) {
          anime({
            targets: indicator,
            scale: [0, 1.2, 1],
            opacity: [0, 1],
            duration: 500,
            easing: "easeOutBack",
          });
        }
      }, 200);
    }
  }

  /* Save to localStorage */
  saveSelectedProducts();

  /* Update the displays with animation */
  updateSelectedProductsDisplay();
  updateProductCardsSelection();
}

/* Update the selected products list display */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="no-selection">No products selected yet</p>';
    return;
  }

  const productsHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item">
        <img src="${product.image}" alt="${product.name}">
        <div class="selected-product-info">
          <h4>${product.name}</h4>
          <p>${product.brand}</p>
        </div>
        <button class="remove-product" data-product-id="${product.id}">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `
    )
    .join("");

  const clearAllButton = `
    <div class="selection-actions">
      <button class="clear-all-btn" id="clearAllBtn">
        <i class="fa-solid fa-trash"></i> Clear All Selections
      </button>
    </div>
  `;

  selectedProductsList.innerHTML = productsHTML + clearAllButton;

  /* Add click listeners to remove buttons */
  const removeButtons =
    selectedProductsList.querySelectorAll(".remove-product");
  removeButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = parseInt(button.dataset.productId);
      const product = selectedProducts.find((p) => p.id === productId);
      if (product) {
        toggleProductSelection(product);
      }
    });
  });

  /* Add click listener to clear all button */
  const clearAllBtn = selectedProductsList.querySelector(".clear-all-btn");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all selected products?")) {
        clearAllSelections();
      }
    });
  }
}

/* Update product cards to reflect current selection state */
function updateProductCardsSelection() {
  const productCards = document.querySelectorAll(".product-card");

  productCards.forEach((card) => {
    const productId = parseInt(card.dataset.productId);
    const isSelected = selectedProducts.some(
      (selected) => selected.id === productId
    );

    if (isSelected) {
      card.classList.add("selected");
      /* Add check mark if not already present */
      if (!card.querySelector(".selection-indicator")) {
        const indicator = document.createElement("div");
        indicator.className = "selection-indicator";
        indicator.innerHTML = '<i class="fa-solid fa-check"></i>';
        card.appendChild(indicator);
      }
    } else {
      card.classList.remove("selected");
      /* Remove check mark if present */
      const indicator = card.querySelector(".selection-indicator");
      if (indicator) {
        indicator.remove();
      }
    }
  });
}

/* Removed duplicate initializeApp function - using the better one at the end */

/* Initialize app - removed duplicate call */

/* Generate Routine button functionality */
const generateRoutineBtn = document.getElementById("generateRoutine");

generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    displayMessage(
      "Please select some products first before generating a routine!",
      "assistant"
    );
    return;
  }

  /* Update button state to show loading */
  const originalText = generateRoutineBtn.innerHTML;
  generateRoutineBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Creating Routine...';
  generateRoutineBtn.disabled = true;

  /* Show loading message */
  displayMessage("Creating your personalized routine...", "assistant", true);

  try {
    /* Generate routine using selected products */
    const routine = await generatePersonalizedRoutine(selectedProducts);

    /* Remove loading message and display routine */
    removeLoadingMessage();
    displayRoutineMessage(routine);
  } catch (error) {
    console.error("Error generating routine:", error);
    removeLoadingMessage();
    displayMessage(
      "I'm sorry, I had trouble creating your routine. Please try again in a moment!",
      "assistant"
    );
  } finally {
    /* Reset button state */
    generateRoutineBtn.innerHTML = originalText;
    generateRoutineBtn.disabled = false;
  }
});

/* Chat form submission handler with OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  if (!userMessage) return;

  /* Display user message */
  displayMessage(userMessage, "user");

  /* Clear input and show appropriate loading message */
  userInput.value = "";
  const needsSearch = shouldPerformWebSearch(userMessage);
  const loadingMessage = needsSearch
    ? "Searching for current information..."
    : "Thinking...";
  displayMessage(loadingMessage, "assistant", true);

  try {
    /* Get AI response */
    const response = await getAIResponse(userMessage);

    /* Remove loading message */
    removeLoadingMessage();

    /* Look for product recommendations in the AI response */
    const recommendedProducts = extractProductRecommendations(response);

    /* Check if web search was used for this response */
    const usedWebSearch = shouldPerformWebSearch(userMessage);

    /* Display AI response with product cards if recommendations found */
    displayMessage(
      response,
      "assistant",
      false,
      recommendedProducts,
      usedWebSearch
    );
  } catch (error) {
    console.error("Error getting AI response:", error);
    removeLoadingMessage();
    displayMessage(
      "I'm sorry, I'm having trouble connecting right now. Please try again in a moment!",
      "assistant"
    );
  }
});

/* Display a message in the chat window */
function displayMessage(
  message,
  sender,
  isLoading = false,
  products = null,
  usedWebSearch = false
) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${sender}${isLoading ? " loading" : ""}${
    usedWebSearch ? " web-enhanced" : ""
  }`;

  if (sender === "user") {
    messageDiv.innerHTML = `
      <div class="message-content user-message">
        <strong>You:</strong> ${message}
      </div>
    `;
  } else {
    let content;

    if (isLoading) {
      /* Create animated loading indicator */
      content = `
        <div class="message-content assistant-message loading-content">
          <strong>L'Oréal Advisor:</strong> 
          <span class="loading-text">${message}</span>
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
          ${
            usedWebSearch
              ? '<div class="web-search-indicator"><i class="fa-solid fa-globe"></i> Searching web for latest information</div>'
              : ""
          }
        </div>
      `;
    } else {
      content = `
        <div class="message-content assistant-message">
          <strong>L'Oréal Advisor:</strong> ${message}
          ${
            usedWebSearch
              ? '<div class="web-search-indicator"><i class="fa-solid fa-globe"></i> Enhanced with current web information</div>'
              : ""
          }
        </div>
      `;

      /* Add product recommendations if products are provided */
      if (products && products.length > 0) {
        content += `
          <div class="chat-products">
            ${products
              .map((product) => createChatProductCard(product))
              .join("")}
          </div>
        `;
      }
    }

    messageDiv.innerHTML = content;
  }

  /* Set initial state for animation */
  messageDiv.style.opacity = "0";
  messageDiv.style.transform = "translateY(20px)";

  chatWindow.appendChild(messageDiv);

  /* Animate message appearance */
  anime({
    targets: messageDiv,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 400,
    easing: "easeOutQuart",
  });

  /* Start loading animations if this is a loading message */
  if (isLoading) {
    startLoadingAnimations(messageDiv);
  }

  /* Add click listeners to chat product cards */
  if (products && products.length > 0) {
    addChatProductListeners(messageDiv, products);

    /* Animate product cards */
    const productCards = messageDiv.querySelectorAll(".chat-product-card");
    anime({
      targets: productCards,
      opacity: [0, 1],
      scale: [0.9, 1],
      duration: 500,
      delay: anime.stagger(100),
      easing: "easeOutBack",
    });
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Display routine message with special formatting */
function displayRoutineMessage(routine) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message assistant routine-message";

  messageDiv.innerHTML = `
    <div class="message-content assistant-message routine-content">
      <div class="routine-header">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <strong>Your Personalized L'Oréal Routine</strong>
      </div>
      <div class="routine-text">${routine}</div>
    </div>
  `;

  chatWindow.appendChild(messageDiv);

  /* Store the generated routine for follow-up questions */
  generatedRoutine = routine;

  /* Add routine to conversation history */
  conversationHistory.push({
    role: "assistant",
    content: `Here is your personalized L'Oréal routine: ${routine}`,
  });

  chatWindow.scrollTop = chatWindow.scrollHeight;
} /* Create a product card for chat display */
function createChatProductCard(product) {
  const isSelected = selectedProducts.some(
    (selected) => selected.id === product.id
  );
  const selectedClass = isSelected ? " selected" : "";

  return `
    <div class="chat-product-card${selectedClass}" data-product-id="${
    product.id
  }">
      <img src="${product.image}" alt="${product.name}">
      <div class="chat-product-info">
        <h4>${product.name}</h4>
        <p>${product.brand}</p>
        <button class="chat-add-btn" data-product-id="${product.id}">
          ${isSelected ? "Remove" : "Add to Selection"}
        </button>
      </div>
    </div>
  `;
}

/* Add click listeners to chat product cards */
function addChatProductListeners(messageDiv, products) {
  const productCards = messageDiv.querySelectorAll(".chat-product-card");
  const addButtons = messageDiv.querySelectorAll(".chat-add-btn");

  addButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = parseInt(button.dataset.productId);
      const product = products.find((p) => p.id === productId);

      if (product) {
        toggleProductSelection(product);
        /* Update the button text and card appearance */
        const card = button.closest(".chat-product-card");
        const isSelected = selectedProducts.some(
          (selected) => selected.id === product.id
        );

        if (isSelected) {
          card.classList.add("selected");
          button.textContent = "Remove";
        } else {
          card.classList.remove("selected");
          button.textContent = "Add to Selection";
        }
      }
    });
  });
}

/* Find products by name or brand for AI recommendations */
function findProductsForRecommendation(productNames) {
  const foundProducts = [];

  productNames.forEach((name) => {
    const product = allProducts.find(
      (p) =>
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        p.brand.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(p.name.toLowerCase())
    );

    if (product && !foundProducts.some((fp) => fp.id === product.id)) {
      foundProducts.push(product);
    }
  });

  return foundProducts;
}

/* Remove loading message with animation */
function removeLoadingMessage() {
  const loadingMessage = chatWindow.querySelector(".loading");
  if (loadingMessage) {
    anime({
      targets: loadingMessage,
      opacity: [1, 0],
      translateY: [0, -10],
      duration: 300,
      easing: "easeInQuart",
      complete: () => {
        loadingMessage.remove();
      },
    });
  }
}

/* Start loading animations */
function startLoadingAnimations(messageElement) {
  const dots = messageElement.querySelectorAll(".typing-dot");

  /* Animate typing dots */
  anime({
    targets: dots,
    scale: [1, 1.3, 1],
    duration: 600,
    delay: anime.stagger(200),
    loop: true,
    easing: "easeInOutQuad",
  });

  /* Animate web search indicator if present */
  const webIndicator = messageElement.querySelector(".web-search-indicator");
  if (webIndicator) {
    anime({
      targets: webIndicator,
      backgroundColor: ["#e3a535", "#ff003b", "#e3a535"],
      duration: 2000,
      loop: true,
      easing: "easeInOutSine",
    });
  }
}

/* Get AI response from OpenAI with optional web search */
async function getAIResponse(userMessage) {
  /* Check if user is asking for current information that would benefit from web search */
  const needsWebSearch = shouldPerformWebSearch(userMessage);

  /* Perform web search if needed */
  let webSearchResults = "";
  if (needsWebSearch) {
    const searchResults = await performWebSearch(userMessage);
    webSearchResults = formatSearchResults(searchResults);
  }

  /* Create context about selected products */
  const selectedProductsContext =
    selectedProducts.length > 0
      ? `\n\nThe customer has selected these products: ${selectedProducts
          .map((p) => `${p.name} by ${p.brand}`)
          .join(", ")}.`
      : "\n\nThe customer has not selected any products yet.";

  /* Create context about generated routine */
  const routineContext = generatedRoutine
    ? `\n\nA personalized routine has been generated for the customer. They may ask follow-up questions about this routine.`
    : "";

  /* Enhanced system prompt for L'Oréal advisor with comprehensive knowledge */
  const systemPrompt = `You are an expert L'Oréal beauty advisor with extensive knowledge of current beauty products, ingredients, and trends.
Your job is to guide people toward the right L'Oréal-owned products and help them build effective routines that fit their needs and concerns.

BRAND EXPERTISE:
- L'Oréal Paris: Anti-aging, color cosmetics, hair care innovations
- CeraVe: Dermatologist-developed skincare with ceramides and essential ingredients
- Maybelline: Trendy makeup, mascaras, foundations, lip products
- Garnier: Natural ingredients, sustainable beauty, hair care
- Urban Decay: Bold makeup, eyeshadows, long-lasting formulas
- Lancôme: Luxury skincare and makeup
- Kiehl's: Apothecary-style skincare with proven ingredients

KEY GUIDELINES:
- Be warm, enthusiastic, and knowledgeable about beauty and skincare science
- ALWAYS mention specific product names, key ingredients, and benefits when recommending
- Provide detailed explanations about why products work and how ingredients benefit skin
- Share application tips, timing recommendations, and realistic expectations
- Ask follow-up questions about skin type, concerns, lifestyle, and preferences
- Suggest complete routines with morning and evening steps
- Explain the science behind ingredients like retinol, niacinamide, hyaluronic acid, ceramides
- Address seasonal skincare needs and environmental factors
- Help customers understand product layering and ingredient compatibility
- Stay updated on beauty trends, techniques, and product innovations
- Provide honest advice about realistic timelines for seeing results
- Answer follow-up questions about skincare, haircare, makeup, fragrance, and beauty routines
- Use conversation history to provide personalized, contextual responses
- Keep responses conversational but informative, avoiding overly technical jargon
- RESPONSE LENGTH: Match your response length to the question complexity:
  * Short/simple questions (greetings, yes/no, quick clarifications) → Brief, direct answers (1-2 sentences)
  * Medium questions (product inquiries, basic advice) → Moderate responses (2-3 sentences with key details)
  * Complex questions (routine building, ingredient science, multiple concerns) → Detailed, comprehensive answers with explanations
- Focus exclusively on L'Oréal family brands and related beauty topics${selectedProductsContext}${routineContext}${webSearchResults}`;

  /* Manage conversation history length */
  manageConversationHistory();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...conversationHistory,
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const rawResponse = data.choices[0].message.content;
  return cleanMarkdownFormatting(rawResponse);
}

/* Clean markdown formatting from AI responses */
function cleanMarkdownFormatting(text) {
  /* Remove ** bold formatting */
  let cleaned = text.replace(/\*\*(.*?)\*\*/g, "$1");
  /* Remove ### heading formatting */
  cleaned = cleaned.replace(/^###\s+/gm, "");
  return cleaned;
}

/* Determine if a user message would benefit from web search */
function shouldPerformWebSearch(userMessage) {
  const webSearchKeywords = [
    "latest",
    "new",
    "recent",
    "current",
    "price",
    "cost",
    "buy",
    "purchase",
    "available",
    "where to find",
    "reviews",
    "rating",
    "compare",
    "vs",
    "launch",
    "released",
    "trending",
    "popular",
    "best seller",
    "on sale",
    "discount",
    "ingredients list",
    "full ingredients",
    "updated formula",
  ];

  const message = userMessage.toLowerCase();
  return webSearchKeywords.some((keyword) => message.includes(keyword));
}

/* Perform web search using Brave Search API */
async function performWebSearch(userMessage) {
  try {
    /* Create L'Oréal focused search query */
    const searchQuery = `${userMessage} L'Oréal CeraVe Maybelline Garnier site:loreal.com OR site:cerave.com OR site:maybelline.com OR site:garnier.com`;

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
        searchQuery
      )}&count=5&search_lang=en&country=us&safesearch=strict`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": braveApiKey,
        },
      }
    );

    if (!response.ok) {
      console.warn("Web search failed:", response.status);
      return [];
    }

    const searchData = await response.json();

    /* Extract and format relevant results */
    const results =
      searchData.web?.results?.slice(0, 3).map((result) => ({
        title: result.title,
        url: result.url,
        description: result.description || result.snippet || "",
        snippet: result.snippet || result.description || "",
      })) || [];

    return results;
  } catch (error) {
    console.error("Web search error:", error);
    return [];
  }
}

/* Format search results for AI context */
function formatSearchResults(searchResults) {
  if (!searchResults || searchResults.length === 0) {
    return "";
  }

  const formattedResults = searchResults
    .map(
      (result, index) =>
        `${index + 1}. ${result.title}\n   URL: ${result.url}\n   Info: ${
          result.snippet
        }`
    )
    .join("\n\n");

  return `\n\nCURRENT WEB INFORMATION:\n${formattedResults}\n\nUse this current information to provide up-to-date details about L'Oréal products, pricing, availability, or recent launches. Always cite sources when using this information.`;
}

/* Manage conversation history length to prevent token limits */
function manageConversationHistory() {
  /* Keep last 10 messages (5 exchanges) to maintain context while staying under token limits */
  if (conversationHistory.length > 10) {
    /* Always keep the first message (welcome) and remove older middle messages */
    const firstMessage = conversationHistory[0];
    const recentMessages = conversationHistory.slice(-9);
    conversationHistory = [firstMessage, ...recentMessages];
  }
}

/* Extract product recommendations from AI response */
function extractProductRecommendations(aiResponse) {
  const productKeywords = [
    "CeraVe",
    "Maybelline",
    "Garnier",
    "L'Oréal",
    "Loreal",
    "cleanser",
    "moisturizer",
    "serum",
    "sunscreen",
    "foundation",
    "mascara",
    "lipstick",
    "shampoo",
    "conditioner",
    "cream",
  ];

  const foundProducts = [];
  const responseWords = aiResponse.toLowerCase().split(/[\s,.-]+/);

  /* Look for product keywords in the AI response */
  productKeywords.forEach((keyword) => {
    if (aiResponse.toLowerCase().includes(keyword.toLowerCase())) {
      const products = allProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(keyword.toLowerCase()) ||
          product.brand.toLowerCase().includes(keyword.toLowerCase()) ||
          product.category.toLowerCase().includes(keyword.toLowerCase())
      );

      /* Add unique products to recommendations */
      products.forEach((product) => {
        if (!foundProducts.some((fp) => fp.id === product.id)) {
          foundProducts.push(product);
        }
      });
    }
  });

  /* Limit to 3 products to avoid overwhelming the chat */
  return foundProducts.slice(0, 3);
}

/* Generate personalized routine based on selected products */
async function generatePersonalizedRoutine(selectedProducts) {
  /* Create detailed product data for AI */
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  /* Create enhanced system prompt for comprehensive routine generation */
  const routinePrompt = `You are an expert L'Oréal beauty advisor creating a comprehensive, personalized skincare and beauty routine.

ROUTINE REQUIREMENTS:
Create a detailed, step-by-step routine that includes:

1. TIMING & FREQUENCY:
   - Specific morning routine steps with timing
   - Detailed evening routine steps
   - Weekly treatments or special care days
   - Gradual introduction schedule for active ingredients

2. APPLICATION DETAILS:
   - Exact order of product application and why
   - Amount to use (pump, pea-size, thin layer, etc.)
   - Application techniques and tools needed
   - Wait times between products when necessary

3. INGREDIENT SYNERGIES:
   - How products work together to enhance benefits
   - Which combinations boost effectiveness
   - Any ingredients to avoid mixing or timing considerations
   - pH levels and product interactions

4. EXPECTED RESULTS:
   - Realistic timeline for seeing improvements (2-4 weeks, 6-8 weeks, etc.)
   - Specific benefits for each product and the overall routine
   - What to expect during adjustment period
   - Long-term skin health benefits

5. PERSONALIZATION TIPS:
   - How to adjust routine for seasonal changes
   - Modifications for sensitive skin or reactions
   - When to increase or decrease product frequency
   - Signs that the routine is working effectively

SELECTED PRODUCTS TO WORK WITH:
${productData
  .map(
    (product) =>
      `- ${product.name} by ${product.brand} (${product.category}): ${product.description}`
  )
  .join("\n")}

Create an encouraging, professional routine that maximizes these specific products' benefits while educating the customer about proper skincare science and techniques.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a professional L'Oréal beauty advisor specializing in creating personalized skincare and beauty routines.",
        },
        {
          role: "user",
          content: routinePrompt,
        },
      ],
      max_tokens: 1200,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const rawRoutine = data.choices[0].message.content;
  return cleanMarkdownFormatting(rawRoutine);
}

/* Initialize app with loading animations */
async function initializeApp() {
  try {
    /* Show loading state */
    productsContainer.innerHTML = `
      <div class="app-loading">
        <div class="loading-logo">
          <i class="fa-solid fa-sparkles"></i>
          <h3>Loading L'Oréal Products</h3>
          <div class="loading-bar">
            <div class="loading-progress"></div>
          </div>
        </div>
      </div>
    `;

    /* Animate loading elements */
    anime({
      targets: ".loading-logo",
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 600,
      easing: "easeOutQuart",
    });

    anime({
      targets: ".loading-progress",
      width: ["0%", "100%"],
      duration: 1500,
      easing: "easeInOutQuart",
    });

    /* Load selected products from storage */
    loadSelectedProducts();

    /* Load and display products */
    const products = await loadProducts();

    /* Add slight delay for better UX */
    setTimeout(() => {
      /* Use the filter function to display all products initially */
      filterAndDisplayProducts();

      /* Update displays to show any previously selected products */
      updateSelectedProductsDisplay();

      /* Add simple welcome message without product suggestions */
      const welcomeMessage =
        "Hi! I'm your L'Oréal beauty advisor. Browse the products above and I'll help you build the perfect routine when you're ready! ✨";

      chatWindow.innerHTML = `
        <div class="chat-message assistant">
          <div class="message-content assistant-message">
            <strong>L'Oréal Advisor:</strong> ${welcomeMessage}
          </div>
        </div>
      `;

      conversationHistory.push({
        role: "assistant",
        content: welcomeMessage,
      });

      /* Animate header and sidebar */
      anime({
        targets: ".page-header",
        opacity: [0, 1],
        translateY: [-20, 0],
        duration: 800,
        delay: 300,
        easing: "easeOutQuart",
      });

      anime({
        targets: ".sidebar",
        opacity: [0, 1],
        translateX: [20, 0],
        duration: 800,
        delay: 500,
        easing: "easeOutQuart",
      });
    }, 800);
  } catch (error) {
    console.error("Error initializing app:", error);
    productsContainer.innerHTML =
      "<p>Error loading products. Please refresh the page.</p>";
  }
}

/* Dark mode functionality */
function initializeDarkMode() {
  const darkModeToggle = document.getElementById("darkModeToggle");
  const savedTheme = localStorage.getItem("theme") || "light";

  /* Apply saved theme */
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateDarkModeIcon(savedTheme);

  /* Add toggle event listener */
  darkModeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateDarkModeIcon(newTheme);

    /* Animate the toggle */
    anime({
      targets: darkModeToggle,
      rotate: "1turn",
      duration: 500,
      easing: "easeOutBack",
    });
  });
}

function updateDarkModeIcon(theme) {
  const icon = document.querySelector(".dark-mode-toggle i");
  icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

/* Start the app when DOM is loaded */
document.addEventListener("DOMContentLoaded", () => {
  /* Set initial opacity for animated elements */
  const animatedElements = document.querySelectorAll(".page-header, .sidebar");
  animatedElements.forEach((el) => {
    el.style.opacity = "0";
  });

  initializeDarkMode();
  initializeApp();
});
