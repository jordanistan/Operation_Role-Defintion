/**
 * Marketing Copy Generator - Creates catchy comments for vase sales
 * Targeting both old (existing) and new clients
 */
export class MarketingCopyGenerator {
  constructor() {
    this.templates = {
      newClient: {
        welcome: [
          "🌸 Welcome to our vase collection! Each piece is handpicked to bring beauty to your space.",
          "✨ Discover the perfect vase to transform your home décor!",
          "🏠 New here? Start your collection with our most beloved pieces!",
          "💐 Elevate your interiors with stunning vases from our exclusive collection."
        ],
        urgency: [
          "⏰ Limited stock available! These beauties go fast.",
          "🔥 Hot seller alert! Don't miss out on this customer favorite.",
          "🎁 Only a few left in stock - secure yours today!"
        ],
        benefit: [
          "🌿 Perfect for fresh flowers, dried arrangements, or standing alone as art.",
          "🪴 Designed to complement any style - modern, classic, or boho.",
          "💫 Premium quality that lasts for years to come."
        ]
      },
      returningClient: {
        loyalty: [
          "💖 Thank you for being a valued member of our family!",
          "🌺 Welcome back! We saved something special for you.",
          "🎉 Our favorite customer is back! Let's find you the perfect piece."
        ],
        exclusive: [
          "👑 Exclusive offer just for you - our cherished returning clients!",
          "💝 As always, we have something extra special waiting for you.",
          "⭐ You deserve the best - here's an exclusive discount just for loyal customers!"
        ],
        restock: [
          "📦 We've restocked your favorites! Time to add to your beautiful collection.",
          "🌸 New arrivals that match perfectly with your existing pieces!",
          "✨ The vases you've been waiting for are finally back in stock!"
        ]
      }
    };

    this.hashtags = [
      "#VaseLove", "#HomeDecor", "#FlowerArrangement", "#InteriorDesign",
      "#HandmadeVase", "#DecorInspo", "#HomeStyle", "#VaseCollection",
      "#BotanicalDecor", "#ArtOfFlowers", "#HomeIsWhere", "#StylingIdeas"
    ];
  }

  randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getRandomHashtags(count = 5) {
    const shuffled = [...this.hashtags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  generateForNewClient(options = {}) {
    const { includeUrgency = true, includeBenefit = true, customText } = options;
    const parts = [];

    const welcome = this.randomItem(this.templates.newClient.welcome);
    parts.push(welcome);

    if (includeBenefit) {
      const benefit = this.randomItem(this.templates.newClient.benefit);
      parts.push(benefit);
    }

    if (includeUrgency) {
      const urgency = this.randomItem(this.templates.newClient.urgency);
      parts.push(urgency);
    }

    if (customText) {
      parts.unshift(customText);
    }

    const hashtags = this.getRandomHashtags(5);

    return {
      message: parts.join("\n\n"),
      hashtags: hashtags,
      fullPost: parts.join("\n\n") + "\n\n" + hashtags.join(" "),
      audience: "new"
    };
  }

  generateForReturningClient(options = {}) {
    const { includeExclusive = true, includeRestock = true, customText } = options;
    const parts = [];

    const loyalty = this.randomItem(this.templates.returningClient.loyalty);
    parts.push(loyalty);

    if (includeRestock) {
      const restock = this.randomItem(this.templates.returningClient.restock);
      parts.push(restock);
    }

    if (includeExclusive) {
      const exclusive = this.randomItem(this.templates.returningClient.exclusive);
      parts.push(exclusive);
    }

    if (customText) {
      parts.unshift(customText);
    }

    const hashtags = this.getRandomHashtags(5);

    return {
      message: parts.join("\n\n"),
      hashtags: hashtags,
      fullPost: parts.join("\n\n") + "\n\n" + hashtags.join(" "),
      audience: "returning"
    };
  }

  generatePromotional(customText) {
    const parts = [];

    if (customText) {
      parts.push(customText);
    } else {
      parts.push("🌸 Transform your space with our beautiful vase collection!");
      parts.push("Each piece is crafted with love to bring joy to your home.");
    }

    const hashtags = this.getRandomHashtags(6);

    return {
      message: parts.join("\n\n"),
      hashtags: hashtags,
      fullPost: parts.join("\n\n") + "\n\n" + hashtags.join(" "),
      audience: "general"
    };
  }

  getTemplates() {
    return {
      newClient: this.templates.newClient,
      returningClient: this.templates.returningClient,
      hashtags: this.hashtags
    };
  }
}

export default MarketingCopyGenerator;
