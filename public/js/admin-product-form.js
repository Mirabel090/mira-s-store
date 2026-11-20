/* ==========================================================
   admin-product-form.js — Add a new product / edit an existing one
   Depends on main.js (getProducts, escapeHTML) and admin-api.js
   ========================================================== */

requireAdmin(); // not signed in? go back to login

const productForm = document.getElementById("product-form");
const messageBox = document.getElementById("form-message");
const saveBtn = document.getElementById("save-btn");

const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const priceInput = document.getElementById("price");
const imageInput = document.getElementById("image");
const imageHint = document.getElementById("image-hint");
const descriptionInput = document.getElementById("description");
const featuredInput = document.getElementById("featured");
const imagePreview = document.getElementById("image-preview");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB before shrinking

// ?id=3 in the address means we are editing product 3
const editId = Number(new URLSearchParams(window.location.search).get("id")) || null;

let selectedFile = null; // a new photo chosen by the admin
let currentImage = ""; // the product's existing image (edit mode)
let previewUrl = null;

/* ---------- Messages ---------- */
function showMessage(text, type) {
  messageBox.innerHTML = "";
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = text; // textContent keeps this safe from injected HTML
  messageBox.appendChild(alert);
  messageBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------- Image preview ---------- */
function showPreview(src) {
  if (!src) {
    imagePreview.classList.add("hidden");
    return;
  }
  imagePreview.src = src;
  imagePreview.classList.remove("hidden");
}

imageInput.addEventListener("change", () => {
  messageBox.innerHTML = "";
  const file = imageInput.files[0];

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  if (!file) {
    selectedFile = null;
    showPreview(currentImage);
    return;
  }

  if (!file.type.startsWith("image/")) {
    imageInput.value = "";
    selectedFile = null;
    showPreview(currentImage);
    showMessage("Please choose an image file (JPG, PNG or WebP).", "error");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    imageInput.value = "";
    selectedFile = null;
    showPreview(currentImage);
    showMessage("That image is too large. Please choose one under 10 MB.", "error");
    return;
  }

  selectedFile = file;
  previewUrl = URL.createObjectURL(file);
  showPreview(previewUrl);
});

imagePreview.addEventListener("error", () => imagePreview.classList.add("hidden"));

/* ---------- Shrink the photo before uploading ----------
   Max 1200px on the longest side, saved as JPEG. A big phone photo
   becomes a small file, so the shop stays fast. */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_SIZE = 1200;
      const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // white behind transparent PNGs
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process this image."))),
        "image/jpeg",
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image. Try a JPG or PNG file."));
    };

    img.src = url;
  });
}

/* ---------- Validation ---------- */
function validate(data) {
  if (!data.name) return "Please enter the product name.";
  if (!data.category) return "Please enter a category.";
  if (!Number.isInteger(data.price) || data.price <= 0) {
    return "Price must be a whole number greater than zero.";
  }
  if (!selectedFile && !currentImage) return "Please choose a product image.";
  return null;
}

/* ---------- Submit (publish or save changes) ---------- */
productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageBox.innerHTML = "";

  const data = {
    name: nameInput.value.trim(),
    category: categoryInput.value.trim(),
    price: Number(priceInput.value),
    image: currentImage,
    description: descriptionInput.value.trim(),
    featured: featuredInput.checked,
  };

  const error = validate(data);
  if (error) {
    showMessage(error, "error");
    return;
  }

  if (editId) data.id = editId;

  saveBtn.disabled = true;

  try {
    // 1. Upload the new photo first (if one was chosen)
    if (selectedFile) {
      saveBtn.textContent = "Uploading image...";
      const blob = await compressImage(selectedFile);
      const uploaded = await adminUploadImage(blob);
      data.image = uploaded.url;
    }

    // 2. Save the product
    saveBtn.textContent = "Saving...";
    await adminSaveProduct(data);

    showMessage(editId ? "Product updated! Going back..." : "Product published! Going back...", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 1000);
  } catch (err) {
    saveBtn.disabled = false;
    saveBtn.textContent = editId ? "Save Changes" : "Publish Product";
    showMessage(err.message || "Could not save the product. Please try again.", "error");
  }
});

/* ---------- Start ---------- */
async function initForm() {
  let products;
  try {
    products = await getProducts();
  } catch (error) {
    showMessage("Could not load data. Please refresh the page.", "error");
    return;
  }

  // Suggest the categories that already exist
  const categories = [...new Set(products.map((p) => p.category))];
  document.getElementById("category-list").innerHTML = categories
    .map((c) => `<option value="${escapeHTML(c)}"></option>`)
    .join("");

  if (!editId) return; // add mode: the empty form is ready

  // Edit mode: fill the form with the product's current details
  const product = products.find((p) => p.id === editId);
  if (!product) {
    showMessage("That product could not be found. It may have been deleted.", "error");
    productForm.classList.add("hidden");
    return;
  }

  document.getElementById("page-title").textContent = "Edit Product | Oakline Admin";
  document.getElementById("form-title").textContent = "Edit Product";
  saveBtn.textContent = "Save Changes";
  imageHint.textContent = "Choose a new photo only if you want to replace the current one.";

  nameInput.value = product.name;
  categoryInput.value = product.category;
  priceInput.value = product.price;
  descriptionInput.value = product.description || "";
  featuredInput.checked = Boolean(product.featured);
  currentImage = product.image;
  showPreview(currentImage);
}

document.getElementById("logout-btn").addEventListener("click", logoutAdmin);

initForm();