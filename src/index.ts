import getPostText from "./lib/getPostText.js";

async function main() {
  try {
    const text = await getPostText();

    if (!text) {
      console.log("Brak nowego posta do opublikowania.");
      return;
    }

    console.log(`✅ Opublikowano: ${url}`);
  } catch (error) {
    console.error("❌ Błąd w działaniu bota:", error);
    process.exit(1);
  }
}

main();
