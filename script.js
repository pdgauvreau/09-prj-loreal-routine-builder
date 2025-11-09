/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

/* Array to track selected products */
let selectedProducts = [];

/* Array to store conversation history */
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful beauty and skincare expert at L'Oréal. Provide friendly, knowledgeable advice about beauty products, skincare routines, haircare, makeup, fragrance, and product recommendations. Be concise but informative. Only answer questions related to beauty, skincare, haircare, makeup, fragrance, and wellness topics.",
  },
];

/* Load selected products from localStorage on page load */
function loadSelectedProductsFromStorage() {
  const stored = localStorage.getItem("lorealSelectedProducts");
  if (stored) {
    try {
      selectedProducts = JSON.parse(stored);
      updateSelectedProductsDisplay();
    } catch (error) {
      console.error("Error loading selected products:", error);
      localStorage.removeItem("lorealSelectedProducts");
    }
  }
}

/* Save selected products to localStorage */
function saveSelectedProductsToStorage() {
  try {
    localStorage.setItem(
      "lorealSelectedProducts",
      JSON.stringify(selectedProducts)
    );
  } catch (error) {
    console.error("Error saving selected products:", error);
  }
}

/* Clear all selected products */
function clearAllProducts() {
  if (selectedProducts.length === 0) return;

  if (confirm("Are you sure you want to clear all selected products?")) {
    selectedProducts = [];
    saveSelectedProductsToStorage();
    updateSelectedProductsDisplay();

    // Remove selected class from all product cards
    document.querySelectorAll(".product-card.selected").forEach((card) => {
      card.classList.remove("selected");
    });
  }
}

/* Make clearAllProducts available globally */
window.clearAllProducts = clearAllProducts;

/* Load saved products when page loads */
loadSelectedProductsFromStorage();

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

/* Update the selected products display */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-state">No products selected yet. Click on products above to add them to your routine!</p>
    `;
    generateRoutineBtn.disabled = true;
  } else {
    selectedProductsList.innerHTML =
      selectedProducts
        .map(
          (product) => `
        <div class="selected-product-tag" data-product-id="${product.id}">
          <span>${product.name}</span>
          <button onclick="removeProduct('${product.id}')" aria-label="Remove ${product.name}">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      `
        )
        .join("") +
      `
      <button class="clear-all-btn" onclick="clearAllProducts()" aria-label="Clear all products">
        <i class="fa-solid fa-trash-can"></i> Clear All
      </button>
    `;
    generateRoutineBtn.disabled = false;
  }
}

/* Toggle product selection */
function toggleProductSelection(product, cardElement) {
  const productIndex = selectedProducts.findIndex((p) => p.id === product.id);

  if (productIndex === -1) {
    // Add product to selection
    selectedProducts.push(product);
    cardElement.classList.add("selected");
  } else {
    // Remove product from selection
    selectedProducts.splice(productIndex, 1);
    cardElement.classList.remove("selected");
  }

  saveSelectedProductsToStorage();
  updateSelectedProductsDisplay();
}

/* Remove product from selection (called from selected products list) */
function removeProduct(productId) {
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);

  // Also remove the selected class from the card in the grid
  const cardElement = document.querySelector(
    `.product-card[data-product-id="${productId}"]`
  );
  if (cardElement) {
    cardElement.classList.remove("selected");
  }

  saveSelectedProductsToStorage();
  updateSelectedProductsDisplay();
}

/* Make removeProduct available globally for onclick */
window.removeProduct = removeProduct;

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      return `
        <div class="product-card ${
          isSelected ? "selected" : ""
        }" data-product-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button class="info-btn" aria-label="View product description" data-product-index="${products.indexOf(
              product
            )}">
              <i class="fa-solid fa-info-circle"></i>
            </button>
          </div>
          <div class="product-description">
            <p>${product.description || "No description available."}</p>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click event listeners to all product cards (for selection)
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card, index) => {
    card.addEventListener("click", (e) => {
      // Don't toggle selection if clicking the info button
      if (!e.target.closest(".info-btn")) {
        toggleProductSelection(products[index], card);
      }
    });
  });

  // Add click event listeners to info buttons (for description toggle)
  const infoButtons = document.querySelectorAll(".info-btn");
  infoButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card selection
      const card = btn.closest(".product-card");
      card.classList.toggle("show-description");

      // Update aria-label for accessibility
      const isExpanded = card.classList.contains("show-description");
      btn.setAttribute(
        "aria-label",
        isExpanded ? "Hide product description" : "View product description"
      );
      btn.setAttribute("aria-expanded", isExpanded);
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Generate Routine button handler */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length > 0) {
    // Show loading state
    chatWindow.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; color: #ff003b;">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Generating your personalized routine...</p>
      </div>
    `;
    generateRoutineBtn.disabled = true;
    generateRoutineBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

    try {
      // Prepare the product data for the API
      const productData = selectedProducts.map((p) => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description || "No description available",
      }));

      const userMessage = `Create a personalized beauty routine using these products:\n\n${JSON.stringify(
        productData,
        null,
        2
      )}\n\nProvide a step-by-step routine with specific instructions on when and how to use each product for optimal results.`;

      // Add user message to conversation history
      conversationHistory.push({
        role: "user",
        content: userMessage,
      });

      // Call Cloudflare Worker with conversation history
      const response = await fetch(
        "https://lorealworker.pdgauvreau.workers.dev",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversationHistory,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const routine = data.choices[0].message.content;

      // Add assistant response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: routine,
      });

      // Display the generated routine
      chatWindow.innerHTML = `
        <div style="color: #ff003b; font-weight: 600; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-sparkles"></i>
          Your Personalized Routine
        </div>
        <div style="line-height: 1.8; white-space: pre-wrap;">${routine}</div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
          <p style="color: #e3a535; font-size: 14px; font-weight: 500;">
            <i class="fa-solid fa-comment-dots"></i> Have questions about your routine? Ask below!
          </p>
        </div>
      `;
    } catch (error) {
      console.error("Error generating routine:", error);
      chatWindow.innerHTML = `
        <div style="color: #ff003b;">
          <p style="font-weight: 600; margin-bottom: 10px;">
            <i class="fa-solid fa-exclamation-circle"></i> Error Generating Routine
          </p>
          <p style="color: #666;">There was an error connecting to the API. Please try again.</p>
          <p style="color: #999; font-size: 14px; margin-top: 10px;">Error details: ${error.message}</p>
        </div>
      `;
    } finally {
      // Reset button state
      generateRoutineBtn.disabled = false;
      generateRoutineBtn.innerHTML =
        '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine';
    }
  }
});

/* Helper function to render conversation history */
function renderConversation() {
  const messagesHTML = conversationHistory
    .filter((msg) => msg.role !== "system") // Don't show system messages
    .map((msg) => {
      if (msg.role === "user") {
        return `
          <div style="margin-bottom: 15px;">
            <p style="color: #666; font-size: 14px; margin-bottom: 5px;"><strong>You:</strong></p>
            <p style="background: #f5f5f5; padding: 12px; border-radius: 8px; line-height: 1.6;">${msg.content}</p>
          </div>
        `;
      } else {
        return `
          <div style="margin-bottom: 15px;">
            <p style="color: #ff003b; font-size: 14px; margin-bottom: 5px; font-weight: 600;">
              <i class="fa-solid fa-sparkles"></i> L'Oréal Assistant:
            </p>
            <p style="background: linear-gradient(135deg, rgba(255, 0, 59, 0.03) 0%, rgba(227, 165, 53, 0.03) 100%); padding: 12px; border-radius: 8px; line-height: 1.8; white-space: pre-wrap;">${msg.content}</p>
          </div>
        `;
      }
    })
    .join("");

  chatWindow.innerHTML =
    messagesHTML +
    `
    <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
      <p style="color: #e3a535; font-size: 14px; font-weight: 500;">
        <i class="fa-solid fa-comment-dots"></i> Ask follow-up questions about your routine!
      </p>
    </div>
  `;

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Chat form submission handler - for asking questions about products */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  if (!userMessage) return;

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Clear input
  userInput.value = "";

  // Render conversation with loading indicator
  renderConversation();
  chatWindow.innerHTML += `
    <div style="display: flex; align-items: center; gap: 10px; color: #ff003b; margin-top: 15px;">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Thinking...</p>
    </div>
  `;

  try {
    // Call Cloudflare Worker with full conversation history
    const response = await fetch(
      "https://lorealworker.pdgauvreau.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add assistant response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    // Render updated conversation
    renderConversation();
  } catch (error) {
    console.error("Error in chat:", error);

    // Remove the last user message from history since the request failed
    conversationHistory.pop();

    // Show error
    renderConversation();
    chatWindow.innerHTML += `
      <div style="color: #ff003b; margin-top: 15px; padding: 12px; background: #fff5f7; border-radius: 8px;">
        <p style="font-weight: 600; margin-bottom: 10px;">
          <i class="fa-solid fa-exclamation-circle"></i> Error
        </p>
        <p style="color: #666;">There was an error connecting to the API. Please try again.</p>
      </div>
    `;
  }
});
