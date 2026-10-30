module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/website-images");

  return {
    dir: { input: "src", output: "_site", includes: "_includes" },
    templateFormats: ["njk", "html"],
    htmlTemplateEngine: "njk",
  };
};
