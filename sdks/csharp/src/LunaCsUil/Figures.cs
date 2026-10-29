using System.Collections.Generic;

namespace LunaCsUil
{
    /// <summary>
    /// Figure placeholders in problem statements.
    /// </summary>
    /// <remarks>
    /// Problem statements refer to figures by placeholder, e.g. <c>![Figure 1](uil-cs-api-figure:1)</c>,
    /// and the API returns the current URL for each placeholder alongside the markdown. URLs can change
    /// when the server moves its storage, so resolve them when rendering instead of saving them.
    /// </remarks>
    public static class Figures
    {
        /// <summary>
        /// Returns <paramref name="markdown"/> with every placeholder in <paramref name="images"/>
        /// replaced by its URL.
        /// </summary>
        /// <remarks>
        /// Placeholders without a URL are left as they are, so a renderer can show them as missing.
        /// Only link targets (<c>](placeholder)</c>) are replaced; the placeholder format itself is
        /// the server's business.
        /// </remarks>
        public static string Resolve(string markdown, IReadOnlyDictionary<string, string> images)
        {
            var resolved = markdown;
            foreach (var image in images)
            {
                resolved = resolved.Replace($"]({image.Key})", $"]({image.Value})");
            }
            return resolved;
        }
    }
}
