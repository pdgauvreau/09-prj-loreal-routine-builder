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
generateRoutineBtn.addEventListener("click", () => {
  if (selectedProducts.length > 0) {
    const productNames = selectedProducts.map((p) => p.name).join(", ");
    chatWindow.innerHTML = `
      <p style="color: #ff003b; font-weight: 500;">✨ Selected Products:</p>
      <p style="margin-top: 10px;">${productNames}</p>
      <p style="margin-top: 15px; color: #666;">Ready to generate your personalized routine! Connect to the OpenAI API for recommendations.</p>
    `;
  }
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
