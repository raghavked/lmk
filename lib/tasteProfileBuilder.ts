export class TasteProfileBuilder {
  /**
   * Computes a user's taste profile based on their ratings
   */
  static computeTasteProfile(ratings: any[], objects: any[]) {
    const categories = ['restaurant', 'movie', 'tv_show', 'article', 'youtube'];
    const profile = categories.map(category => {
      const categoryRatings = ratings.filter(r => {
        const obj = objects.find(o => o.id === r.object_id);
        return obj?.category === category;
      });

      if (categoryRatings.length === 0) {
        return { category, tags: [], avg_price_rated: 0, last_computed: new Date().toISOString() };
      }

      // Aggregate tags
      const tagCounts: Record<string, number> = {};
      let totalPrice = 0;

      categoryRatings.forEach(r => {
        const obj = objects.find(o => o.id === r.object_id);
        if (obj?.tags) {
          obj.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + (r.score / 10);
          });
        }
        if (obj?.price_level) totalPrice += obj.price_level;
      });

      const tags = Object.entries(tagCounts)
        .map(([tag, weight]) => ({ tag, weight: Math.min(1, weight / categoryRatings.length) }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10);

      return {
        category,
        tags,
        avg_price_rated: totalPrice / categoryRatings.length,
        last_computed: new Date().toISOString(),
      };
    });

    return profile;
  }
}
