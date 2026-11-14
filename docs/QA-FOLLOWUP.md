# Client QA follow-up

12 November 2026. This update supersedes the original brand-review references to a credential dialog. All changes remain local; no commits or pushes were made.

## Implemented

- Both client-supplied credential files are visibly rendered inside the actual `<footer>`. `footer2.jpeg` is an inline image, not hidden in a modal. An optional full-size link preserves readability on small screens.
- Removed the credential pop-up, so its reported Escape/focus issue no longer applies.
- Added a real financing-information destination within the estimate section. The announcement links to it and it leads back to the existing form. No lender, rate or approval terms were guessed.
- Added silver accents to statistics and dividers. Silver is used for large values in dark mode; light-mode values stay dark for contrast. The actual logo is not recreated or recolored.
- Changed the audience label to the exact QA-requested `Multi Family Specialist`.
- Increased the header/footer logo display size, added a 512px derivative and descriptive alt text. The supplied JPEG's white background remains; a transparent original/vector is still a client asset request.
- Created a tighter truck-image crop that excludes the timestamp. The original 1600x1200 client photo is untouched. Both responsive variants and the JPEG fallback use the same crop, without generative edits.
- Removed the repeated electrical-panel image from the project section. It remains once in the FWC Approach section. The water-heater case study now has a real matching project photo from the existing FWC website, shown in its original proportions.
- Aligned the estimate copy with the top of the form instead of vertically centering it in a large blank area. A useful financing callout fills the lower left column.
- Added a wrapping header, single-column highlights and adjusted credential layout for extremely narrow viewports, alongside the required mobile sizes.

Project image source: https://fwccompanies.com/project-showcases/commercial-water-heater-clean-out-restores-performance
Image source: https://d13cw1lxlociqy.cloudfront.net/ylvhpas2515uuq20vin3l8rwo5t0
The available water-heater photograph is 338x600; it is not upscaled to invent missing detail. Additional original-resolution job photos would improve future galleries.

## Retained verified details

`robert@fwccompanies.com` remains the verified contact address; no `info@` or `service@` mailbox was invented. The copyright continues to use **FWC LLC**, the previously verified legal name. **FWC Plumbing & Rooter** is the client-approved public brand and **FWC Companies** the associated branding.

## Still needs client documentation

- Current CSLB license number and applicable classification details. The public lookup attempted during this update did not provide a confirmable business record, so no number was guessed from the truck's fine print.
- Current certification/accreditation documents, badge-use permissions and any guarantee terms in the supplied promotional graphic. Displaying that graphic does not independently verify its claims.
- Transparent/vector logo, clean daytime truck photo and more high-resolution job photographs.
- Financing provider and applicable terms before publishing any lender-specific information.

## Verification

ESLint, strict TypeScript production build, and all 36 existing unit/server/function tests passed. Browser checks verify both credential images are inline in the footer, financing has a real destination, the exact audience wording is present, theme behavior works and all image URLs resolve. Responsive and mocked form checks run in both light/dark modes; no live lead is submitted by the QA scripts.

Final browser results: all nine widths (240, 320, 360, 375, 390, 430, 768, 1024, 1440px) passed in both themes. Automated axe checks reported zero violations at 375/1440px in each theme. Visible inline footer images, financing destination, exact audience wording, image loading, stored theme and blocked-storage behavior passed. Mocked form validation, provider failure, retained entries, retry and confirmed success passed in each theme without sending a real lead. Desktop and mobile screenshots are in ignored artifacts/brand-review/*-qa-*.png. The new images were visually inspected.
