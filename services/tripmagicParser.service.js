// // services/tripmagicParser.service.js
// // Parses TripMagics lead email HTML/text and extracts structured lead data

// /**
//  * Detects if an email is from TripMagics
//  * @param {object} message - Gmail message object with from, subject, htmlBody, body fields
//  * @returns {boolean}
//  */
// export function isTripMagicEmail(message) {
//   const from    = (message.from    || "").toLowerCase();
//   const subject = (message.subject || "").toLowerCase();
//   const body    = (message.htmlBody || message.body || "").toLowerCase();

//   return (
//     from.includes("tripmagic") ||
//     from.includes("noreply@tripmagics.com") ||
//     subject.includes("tripmagic") ||
//     body.includes("tripmagics leads") ||
//     body.includes("tripmagics lead") ||
//     body.includes("you have successfully purchased a new travel lead from tripmagics")
//   );
// }

// /**
//  * Extracts text content from HTML string
//  */
// function stripHtml(html) {
//   return html
//     .replace(/<br\s*\/?>/gi, "\n")
//     .replace(/<\/tr>/gi, "\n")
//     .replace(/<\/td>/gi, " | ")
//     .replace(/<[^>]+>/g, " ")
//     .replace(/&nbsp;/gi, " ")
//     .replace(/&amp;/gi, "&")
//     .replace(/&lt;/gi, "<")
//     .replace(/&gt;/gi, ">")
//     .replace(/&quot;/gi, '"')
//     .replace(/&#39;/gi, "'")
//     .replace(/\s{2,}/g, " ")
//     .trim();
// }

// /**
//  * Extracts table rows from HTML — returns array of {label, value} pairs
//  * Handles the typical TripMagics HTML table format:
//  * <tr><td>Name</td><td>John Doe</td></tr>
//  */
// function extractTableRows(html) {
//   const rows = [];
//   // Match <tr>...</tr> blocks
//   const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
//   let trMatch;

//   while ((trMatch = trRegex.exec(html)) !== null) {
//     const rowHtml = trMatch[1];
//     // Extract all <td> values in this row
//     const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
//     const cells = [];
//     let tdMatch;
//     while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
//       cells.push(stripHtml(tdMatch[1]).trim());
//     }
//     if (cells.length >= 2) {
//       rows.push({ label: cells[0].toLowerCase(), value: cells[1].trim() });
//     }
//   }

//   return rows;
// }

// /**
//  * Parses a phone number — strips country code formatting for storage
//  */
// function parsePhone(raw) {
//   if (!raw) return "";
//   // Remove spaces, dashes, parentheses — keep + and digits
//   return raw.replace(/[\s\-().]/g, "").trim();
// }

// /**
//  * Parses a date string into ISO format
//  */
// function parseDate(raw) {
//   if (!raw || raw === "-" || raw === "N/A") return null;
//   try {
//     const d = new Date(raw);
//     if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
//   } catch {}
//   return null;
// }

// /**
//  * Parses number of travellers
//  * Handles formats like "4", "4 Adults", "2 adults + 1 child", etc.
//  */
// function parseTravellers(raw) {
//   if (!raw || raw === "-") return { adults: null, children: null };

//   const lower = raw.toLowerCase();

//   // Format: "2 adults + 1 child" or "2 Adults, 1 Children"
//   const adultMatch    = lower.match(/(\d+)\s*adult/);
//   const childMatch    = lower.match(/(\d+)\s*child/);

//   if (adultMatch || childMatch) {
//     return {
//       adults:   adultMatch  ? parseInt(adultMatch[1],  10) : null,
//       children: childMatch  ? parseInt(childMatch[1], 10) : null,
//     };
//   }

//   // Format: plain number like "4" — treat as adults
//   const plain = parseInt(raw, 10);
//   if (!isNaN(plain)) return { adults: plain, children: null };

//   return { adults: null, children: null };
// }

// /**
//  * Main parser — extracts lead fields from a TripMagics email message
//  * @param {object} message - { subject, from, htmlBody, body, date }
//  * @returns {object} leadData
//  */
// export function parseTripMagicLead(message) {
//   const html    = message.htmlBody || "";
//   const text    = message.body     || stripHtml(html);
//   const rows    = extractTableRows(html);

//   // Helper to find value by label keywords
//   const find = (...keywords) => {
//     for (const kw of keywords) {
//       const row = rows.find((r) => r.label.includes(kw.toLowerCase()));
//       if (row && row.value && row.value !== "-") return row.value;
//     }
//     // Fallback: search plain text
//     for (const kw of keywords) {
//       const regex = new RegExp(`${kw}[:\\s]+([^\\n|]+)`, "i");
//       const m = text.match(regex);
//       if (m && m[1]?.trim()) return m[1].trim();
//     }
//     return "";
//   };

//   // ── Extract all fields ──────────────────────────────────────────────────────
//   const rawName       = find("name", "customer name", "client name");
//   const rawPhone      = find("phone", "mobile", "contact", "number");
//   const rawEmail      = find("email", "mail");
//   const rawToCity     = find("to city", "destination", "to", "travel to");
//   const rawFromCity   = find("from city", "from", "departure");
//   const rawTravelDate = find("travel date", "date of travel", "departure date", "journey date");
//   const rawTravellers = find("travellers", "no of travellers", "number of travellers", "pax", "guests", "passengers");
//   const rawAdults     = find("adults", "no of adults", "number of adults");
//   const rawChildren   = find("children", "kids", "child");
//   const rawBudget     = find("budget", "package cost", "cost");
//   const rawNotes      = find("notes", "requirements", "special request", "message", "query");
//   const rawCountry    = find("country", "nationality");

//   // ── Parse travellers ────────────────────────────────────────────────────────
//   let adults   = null;
//   let children = null;

//   if (rawAdults) {
//     const n = parseInt(rawAdults, 10);
//     if (!isNaN(n)) adults = n;
//   }
//   if (rawChildren) {
//     const n = parseInt(rawChildren, 10);
//     if (!isNaN(n)) children = n;
//   }
//   // If specific adult/child fields not found, try combined travellers field
//   if (adults === null && rawTravellers) {
//     const parsed = parseTravellers(rawTravellers);
//     adults   = parsed.adults;
//     children = parsed.children;
//   }

//   // ── Build destination ───────────────────────────────────────────────────────
//   let destination = rawToCity;
//   if (!destination && message.subject) {
//     // Sometimes subject has "Lead for Kashmir" pattern
//     const subMatch = message.subject.match(/(?:lead for|trip to|travel to)\s+(.+)/i);
//     if (subMatch) destination = subMatch[1].trim();
//   }

//   // ── Build notes ─────────────────────────────────────────────────────────────
//   let notes = rawNotes || "";
//   if (rawBudget)   notes = notes ? `${notes}\nBudget: ${rawBudget}` : `Budget: ${rawBudget}`;
//   if (rawFromCity) notes = notes ? `${notes}\nFrom City: ${rawFromCity}` : `From City: ${rawFromCity}`;
//   notes = notes.trim();

//   // ── Build country ───────────────────────────────────────────────────────────
//   const country = rawCountry || "India"; // TripMagics is India-focused

//   // ── Final lead object ───────────────────────────────────────────────────────
//   return {
//     // leadName:    rawName       || "TripMagics Lead",
//      leadName:    rawName       || "",
//     phoneNumber: parsePhone(rawPhone),
//     email:       rawEmail      || "",
//     destination: destination   || rawToCity || "",
//     country,
//     source:      "Trip Magic",
//     status:      "Cold",
//     notes,
//     noOfAdults:   adults,
//     noOfChildren: children,
//     travelDate:  parseDate(rawTravelDate),
//     _raw: {
//       fromCity:   rawFromCity,
//       travelDate: rawTravelDate,
//       travellers: rawTravellers,
//       budget:     rawBudget,
//     },
//   };
// }

// /**
//  * Extract a unique message identifier for deduplication
//  * Uses the Gmail message ID to prevent creating duplicate leads
//  */
// export function getTripMagicMessageId(message) {
//   return message.id || message.messageId || null;
// }//original



// services/tripmagicParser.service.js
// Parses TripMagics lead email HTML/text and extracts structured lead data

/**
 * Detects if an email is from TripMagics
 * @param {object} message - Gmail message object with from, subject, htmlBody, body fields
 * @returns {boolean}
 */
export function isTripMagicEmail(message) {
  const from    = (message.from    || "").toLowerCase();
  const subject = (message.subject || "").toLowerCase();
  const body    = (message.htmlBody || message.body || "").toLowerCase();

  return (
    from.includes("tripmagic") ||
    from.includes("noreply@tripmagics.com") ||
    subject.includes("tripmagic") ||
    body.includes("tripmagics leads") ||
    body.includes("tripmagics lead") ||
    body.includes("you have successfully purchased a new travel lead from tripmagics")
  );
}

/**
 * Extracts text content from HTML string
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Extracts table rows from HTML — returns array of {label, value} pairs
 * Handles the typical TripMagics HTML table format:
 * <tr><td>Name</td><td>John Doe</td></tr>
 */
function extractTableRows(html) {
  const rows = [];
  // Match <tr>...</tr> blocks
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    // Extract all <td> values in this row
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      cells.push(stripHtml(tdMatch[1]).trim());
    }
    if (cells.length >= 2) {
      rows.push({ label: cells[0].toLowerCase().trim(), value: cells[1].trim() });
    }
  }

  return rows;
}

/**
 * Parses a phone number — strips country code formatting for storage
 */
function parsePhone(raw) {
  if (!raw) return "";
  // Remove spaces, dashes, parentheses — keep + and digits
  return raw.replace(/[\s\-().]/g, "").trim();
}

/**
 * Parses a date string into ISO format
 */
function parseDate(raw) {
  if (!raw || raw === "-" || raw === "N/A") return null;
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {}
  return null;
}

/**
 * Parses number of travellers
 * Handles formats like "4", "4 Adults", "2 adults + 1 child", "2 People" etc.
 */
function parseTravellers(raw) {
  if (!raw || raw === "-") return { adults: null, children: null };

  const lower = raw.toLowerCase();

  // Format: "2 adults + 1 child" or "2 Adults, 1 Children"
  const adultMatch = lower.match(/(\d+)\s*adult/);
  const childMatch = lower.match(/(\d+)\s*child/);

  if (adultMatch || childMatch) {
    return {
      adults:   adultMatch ? parseInt(adultMatch[1], 10) : null,
      children: childMatch ? parseInt(childMatch[1], 10) : null,
    };
  }

  // Format: "2 People" or "2 persons" — treat as adults
  const peopleMatch = lower.match(/(\d+)\s*(?:people|persons?|pax|travell?ers?|guests?|passengers?)/);
  if (peopleMatch) {
    return { adults: parseInt(peopleMatch[1], 10), children: null };
  }

  // Format: plain number like "4" — treat as adults
  const plain = parseInt(raw, 10);
  if (!isNaN(plain)) return { adults: plain, children: null };

  return { adults: null, children: null };
}

/**
 * ── FIXED: Enhanced field finder ──────────────────────────────────────────────
 * Searches table rows by label keywords using partial matching.
 * Also falls back to plain-text regex scan.
 */
function makeFind(rows, text) {
  return (...keywords) => {
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase().trim();
      // Exact label match first
      const exactRow = rows.find((r) => r.label === kwLower);
      if (exactRow && exactRow.value && exactRow.value !== "-") return exactRow.value;
      // Partial label match
      const partialRow = rows.find((r) => r.label.includes(kwLower));
      if (partialRow && partialRow.value && partialRow.value !== "-") return partialRow.value;
    }
    // Fallback: search plain text with flexible regex
    for (const kw of keywords) {
      const regex = new RegExp(`${kw}[:\\s|]+([^\\n|<]+)`, "i");
      const m = text.match(regex);
      if (m && m[1]?.trim() && m[1].trim() !== "-") return m[1].trim();
    }
    return "";
  };
}

/**
 * Main parser — extracts lead fields from a TripMagics email message
 * @param {object} message - { subject, from, htmlBody, body, date }
 * @returns {object} leadData
 */
export function parseTripMagicLead(message) {
  const html = message.htmlBody || "";
  const text = message.body     || stripHtml(html);
  const rows = extractTableRows(html);

  // Debug log to help diagnose field matching issues
  console.log("[TripMagicParser] Extracted table rows:", JSON.stringify(rows, null, 2));

  const find = makeFind(rows, text);

  // ── Extract all fields ─────────────────────────────────────────────────────
  const rawName     = find("name", "customer name", "client name");
  const rawPhone    = find("phone", "mobile", "contact number", "contact", "number");
  const rawEmail    = find("email", "mail");

  // ✅ FIX: "To City" is the exact label in TripMagics emails — list it first
  // Also handle "tocity", "to city", "destination city", "destination", "travel to"
  const rawToCity   = find("to city", "tocity", "destination city", "destination", "travel to", "to");
  const rawFromCity = find("from city", "fromcity", "from", "departure city", "departure");

  const rawTravelDate = find("travel date", "date of travel", "departure date", "journey date", "travel on");

  // ✅ FIX: "Number Of Travelers" is the exact label seen in the email screenshot
  const rawTravellers = find(
    "number of travelers", "number of travellers",
    "no of travellers", "no of travelers",
    "no. of travellers", "no. of travelers",
    "travellers", "travelers", "pax", "guests", "passengers"
  );
  const rawAdults   = find("adults", "no of adults", "number of adults", "no. of adults");
  const rawChildren = find("children", "kids", "child", "no of children", "number of children");
  const rawBudget   = find("budget", "package cost", "cost", "price");
  const rawNotes    = find("notes", "requirements", "special request", "message", "query", "remarks");
  const rawCountry  = find("country", "nationality");

  // ── Parse travellers ────────────────────────────────────────────────────────
  let adults   = null;
  let children = null;

  if (rawAdults) {
    const n = parseInt(rawAdults, 10);
    if (!isNaN(n)) adults = n;
  }
  if (rawChildren) {
    const n = parseInt(rawChildren, 10);
    if (!isNaN(n)) children = n;
  }
  // If specific adult/child fields not found, try combined travellers field
  if (adults === null && rawTravellers) {
    const parsed = parseTravellers(rawTravellers);
    adults   = parsed.adults;
    children = parsed.children;
  }

  // ── ✅ FIX: Build destination — use rawToCity directly ─────────────────────
  // rawToCity should now correctly capture "Madurai Rameswaram Kanyakumari"
  let destination = rawToCity;

  if (!destination && message.subject) {
    // Sometimes subject has "Lead for Kashmir" or "New Travel Inquiry - Kashmir" pattern
    const subMatch = message.subject.match(/(?:lead for|trip to|travel to|inquiry[- ]+)([^-|]+)/i);
    if (subMatch) destination = subMatch[1].trim();
  }

  // ── Build notes ─────────────────────────────────────────────────────────────
  let notes = rawNotes || "";
  if (rawBudget)   notes = notes ? `${notes}\nBudget: ${rawBudget}` : `Budget: ${rawBudget}`;
  if (rawFromCity) notes = notes ? `${notes}\nFrom City: ${rawFromCity}` : `From City: ${rawFromCity}`;
  notes = notes.trim();

  // ── Build country ────────────────────────────────────────────────────────────
  const country = rawCountry || "India"; // TripMagics is India-focused

  // ── Final lead object ────────────────────────────────────────────────────────
  return {
    leadName:    rawName       || "",
    phoneNumber: parsePhone(rawPhone),
    email:       rawEmail      || "",
    destination: destination   || "",   // ✅ City name like "Madurai Rameswaram Kanyakumari"
    country,
    source:      "Trip Magic",
    status:      "Cold",
    notes,
    noOfAdults:   adults,
    noOfChildren: children,
    travelDate:  parseDate(rawTravelDate),
    _raw: {
      fromCity:   rawFromCity,
      travelDate: rawTravelDate,
      travellers: rawTravellers,
      budget:     rawBudget,
      rows,       // ✅ include rows in _raw for debugging
    },
  };
}

/**
 * Extract a unique message identifier for deduplication
 * Uses the Gmail message ID to prevent creating duplicate leads
 */
export function getTripMagicMessageId(message) {
  return message.id || message.messageId || null;
}