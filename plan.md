Application concept: “Elsewhere”

A fictional discovery and planning application for assembling a perfect day in an unfamiliar city.

Users explore cafés, strange shops, galleries, parks, music venues, food, and late-night activities, then arrange them into a visual itinerary. The content can be entirely fabricated or preloaded, because the application exists only to demonstrate your interface and design-system abilities.

It’s a particularly good portfolio piece because it naturally supports:

Search, filtering, sorting, and autocomplete
Maps and spatial UI
Cards, lists, and data-dense detail views
Drag-and-drop itinerary planning
Responsive navigation
Date, time, weather, and travel information
Dialogs, drawers, menus, tooltips, and notifications
Empty, loading, error, saved, and offline states
Data visualization such as cost, travel time, and “day energy”
Accessibility and keyboard interaction
Fluid mobile, tablet, and desktop compositions
Three dramatically different design systems applied to identical functionality

The framing could be:

“Tell Elsewhere what kind of day you want—not where you want to go.”

A user selects qualities like quiet, strange, spontaneous, outdoors, cheap, romantic, social, or late-night. The application generates a flexible itinerary while showing alternatives along the route.

Core experience
Discover

A map-and-results interface with expressive destination cards:

Search by location or atmosphere
Filter by mood, cost, distance, accessibility, and opening hours
Switch between map, list, and split view
Preview destinations without losing context
Save places into a temporary collection
Build a day

A visual timeline containing morning, afternoon, evening, and late-night sections:

Drag activities into the itinerary
Reorder stops
Show travel time between locations
Warn about scheduling conflicts or closed venues
Suggest nearby alternatives
Collapse the timeline into a concise shareable plan
Place details

A rich detail surface showing:

Photography or illustration
Description and atmosphere
Hours, price, neighborhood, and accessibility
Busy and quiet periods
Related destinations
“Why this fits your day”
Add, replace, save, and share actions
Day balance

A small visualization evaluates the itinerary across qualities such as:

Quiet ↔ energetic
Planned ↔ spontaneous
Familiar ↔ unusual
Indoor ↔ outdoor
Cheap ↔ extravagant

This is fictional enough to avoid building a real recommendation engine, but sophisticated enough to demonstrate hierarchy, interaction design, responsive behavior, information density, motion, accessibility, and visual storytelling.

Three switchable UI variations

The application should have a prominent “Design Lens” switcher. Changing the lens leaves the content and functionality untouched while replacing tokens, typography, layout density, component styling, imagery treatment, and motion.

That demonstrates that you designed a real system rather than three unrelated mockups.

1. Field Journal

An editorial, tactile interface inspired by independent travel magazines, field notes, museum catalogs, and annotated maps.

Visual character
Warm paper surfaces
Deep ink typography
Muted botanical and mineral colors
Large editorial headlines
Thin hand-drawn map lines
Subtle grain and imperfect dividers
Photography displayed like prints pasted into a notebook
Small handwritten-style annotations used sparingly
Typography
Expressive serif for headings
Highly legible humanist sans-serif for controls and body text
Monospaced numerals for times, distances, and coordinates
Components
Cards resemble editorial clippings rather than floating rectangles
Selected places receive an offset underline or margin annotation
Filters appear as index tabs or compact labeled stamps
The itinerary resembles a vertical journal entry with time markers
Map pins use numbered, screen-printed shapes
Dialogs feel like inserted sheets of paper
Buttons are typographic and restrained instead of glossy
Motion
Content settles into place with gentle vertical movement
Saved items receive a subtle “marked” animation
Map-to-detail transitions resemble moving between a map and its annotation
Reduced-motion mode removes movement while preserving state feedback
Light mode
Bone, parchment, warm white, charcoal, moss, rust, and faded blue
Very low elevation; grouping comes from spacing, lines, and tonal changes
Images remain warm but retain natural contrast
Dark mode
Near-black green or deep brown rather than neutral black
Warm ivory text
Desaturated amber, sage, clay, and moonlit blue accents
Paper texture becomes extremely subtle to avoid muddy contrast
Photographs remain vivid enough to prevent the experience from becoming uniformly sepia
What it demonstrates

Editorial hierarchy, art direction, typographic judgment, expressive responsive layouts, subtle texture, and a design system that feels human without sacrificing usability.

2. Nocturne

A cinematic, atmospheric interface inspired by city lights, projection, music visualization, and translucent layers.

Visual character
Deep color fields
Controlled translucency
Soft luminous edges
Large environmental imagery
Color gradients derived from the current destination
Floating spatial layers that still maintain strong hierarchy
Deliberate use of blur rather than indiscriminate glassmorphism
Typography
Contemporary grotesk or geometric sans-serif
Large, tightly composed display type
Compact labels with generous tracking
Tabular numerals for the itinerary
Components
Destination cards use image-led composition with contextual overlays
The selected destination subtly influences surrounding accent colors
The itinerary becomes a horizontal spatial journey on large screens and a vertical sequence on mobile
The map uses subdued geography with glowing active routes
Filters appear in a command palette or floating control dock
Detail views open as cinematic layers while preserving the previous spatial context
Charts use luminous lines and soft filled regions
Motion
Shared-element transitions connect cards, map markers, and details
The active route gently draws itself when the itinerary changes
Layers use depth-aware motion and restrained parallax
Hover and focus states brighten locally rather than moving excessively
Motion automatically simplifies under reduced-motion preferences
Light mode
Frosted white and cool gray surfaces over pale atmospheric gradients
Cobalt, violet, cyan, coral, and electric lime used selectively
Stronger borders and shadows compensate for reduced dark-field contrast
Translucent panels remain sufficiently opaque behind text
Dark mode
Ink-black and blue-black foundations
Rich violet, cyan, magenta, and warm amber illumination
Elevated surfaces use tonal contrast before relying on shadows
Focus indicators use high-luminance rings that remain distinct from selection
What it demonstrates

Art direction, motion design, immersive transitions, spatial composition, color systems, visualization, theming, and the ability to make a dramatic interface remain accessible.

3. Civic Modern

A precise, highly functional interface inspired by transit systems, wayfinding, Swiss graphic design, public information systems, and excellent operational software.

Visual character
Strong grid
High information density
Clear typographic hierarchy
Saturated functional colors
Minimal decoration
Excellent alignment and rhythm
Visible system logic
Every visual decision communicates state, grouping, or action
Typography
Neutral variable sans-serif
Carefully tuned optical sizing
Bold display numerals
Tabular times and distances
Consistent type roles rather than numerous arbitrary sizes
Components
Cards become structured information modules
Maps resemble transit diagrams with highly legible routes
The itinerary uses a numbered sequence and unmistakable connection lines
Filters remain visible as a productive toolbar on wide screens and become a well-organized drawer on narrow screens
Status, warnings, and scheduling conflicts use consistent semantic treatments
Tables and data views can become denser without losing readability
Empty and error states are direct, useful, and visually integrated
Motion
Fast and functional
Transitions explain reordering, filtering, insertion, and removal
No ornamental floating or parallax
Components visibly respond within approximately 100–200 milliseconds
Reduced-motion mode changes almost nothing because movement is already restrained
Light mode
Clean white and soft gray foundations
Near-black text
Primary blue or red with carefully separated semantic colors
Crisp one-pixel borders
Occasional full-bleed color panels for strong hierarchy
Dark mode
Graphite surfaces with clearly stepped elevation
Soft white rather than pure-white text
Adjusted semantic colors rather than simply reusing light-mode values
Maps, charts, dividers, and disabled states receive dedicated dark tokens
Forced-colors compatibility is treated as a first-class mode
What it demonstrates

Complex application design, disciplined systems thinking, information architecture, accessibility, responsive density, reusable patterns, and the ability to make utilitarian software beautiful.

Theme architecture

The implementation should separate three concerns:

Layer	Examples	Changes when switching
Structural system	Component APIs, semantics, states, layout primitives	Remains stable
Design lens	Typography, radius, borders, imagery, density, motion, composition	Field Journal, Nocturne, Civic Modern
Color mode	Surface, text, border, action, status and visualization tokens	Light or dark

That produces six complete combinations:

Field Journal Light
Field Journal Dark
Nocturne Light
Nocturne Dark
Civic Modern Light
Civic Modern Dark

The switcher should update the application instantly and preserve the current route, itinerary, selected location, scroll context, and focus. Users should be able to compare the exact same screen across all six systems.

Best portfolio presentation

Include a small “System Inspector” panel that can be enabled separately from the consumer-facing UI. It could show:

Current design lens and color mode
Active semantic tokens
Current viewport and component-container sizes
Responsive state for the selected component
Component name, variant, and interaction state
Contrast values for the current foreground/background pairing
Reduced-motion and forced-colors simulation
Links to the component’s documentation and accessibility contract

That turns Elsewhere from merely a beautiful fictional application into visible proof that you understand design systems, UX engineering, responsive architecture, accessibility, and design-to-code implementation.

