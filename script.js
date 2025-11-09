/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

/* Array to track selected products */
let selectedProducts = [];

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
    selectedProductsList.innerHTML = selectedProducts
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
      .join("");
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

      // Call Cloudflare Worker
      const response = await fetch(
        "https://lorealworker.pdgauvreau.workers.dev",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful beauty and skincare expert at L'Oréal. Create personalized, detailed routines based on the products provided. Be specific about order of application, frequency, and tips for best results.",
              },
              {
                role: "user",
                content: `Create a personalized beauty routine using these products:\n\n${JSON.stringify(
                  productData,
                  null,
                  2
                )}\n\nProvide a step-by-step routine with specific instructions on when and how to use each product for optimal results.`,
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const routine = data.choices[0].message.content;

      // Display the generated routine
      chatWindow.innerHTML = `
        <div style="color: #ff003b; font-weight: 600; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-sparkles"></i>
          Your Personalized Routine
        </div>
        <div style="line-height: 1.8; white-space: pre-wrap;">${routine}</div>
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

/* Chat form submission handler - for asking questions about products */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  if (!userMessage) return;

  // Display user message
  chatWindow.innerHTML = `
    <div style="margin-bottom: 15px;">
      <p style="color: #666; font-size: 14px; margin-bottom: 5px;"><strong>You:</strong></p>
      <p>${userMessage}</p>
    </div>
    <div style="display: flex; align-items: center; gap: 10px; color: #ff003b;">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Thinking...</p>
    </div>
  `;

  userInput.value = "";

  try {
    // Prepare context with selected products if any
    let contextMessage = userMessage;
    if (selectedProducts.length > 0) {
      const productList = selectedProducts
        .map((p) => `${p.name} by ${p.brand}`)
        .join(", ");
      contextMessage += `\n\nContext: The user has selected these products: ${productList}`;
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful beauty and skincare expert at L'Oréal. Provide friendly, knowledgeable advice about beauty products, skincare routines, and product recommendations. Be concise but informative.",
          },
          {
            role: "user",
            content: contextMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Display the conversation
    chatWindow.innerHTML = `
      <div style="margin-bottom: 15px;">
        <p style="color: #666; font-size: 14px; margin-bottom: 5px;"><strong>You:</strong></p>
        <p>${userMessage}</p>
      </div>
      <div>
        <p style="color: #ff003b; font-size: 14px; margin-bottom: 5px; font-weight: 600;">
          <i class="fa-solid fa-sparkles"></i> L'Oréal Assistant:
        </p>
        <p style="line-height: 1.8;">${aiResponse}</p>
      </div>
    `;
  } catch (error) {
    console.error("Error in chat:", error);
    chatWindow.innerHTML = `
      <div style="margin-bottom: 15px;">
        <p style="color: #666; font-size: 14px; margin-bottom: 5px;"><strong>You:</strong></p>
        <p>${userMessage}</p>
      </div>
      <div style="color: #ff003b;">
        <p style="font-weight: 600; margin-bottom: 10px;">
          <i class="fa-solid fa-exclamation-circle"></i> Error
        </p>
        <p style="color: #666;">There was an error connecting to the OpenAI API. Please check your API key and try again.</p>
      </div>
    `;
  }
});
