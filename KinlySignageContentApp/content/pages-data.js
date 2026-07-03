export const PAGES = [
	{
		id: "welcome",
		eyebrow: "Kinly Experience",
		title: "Welcome to the space",
		summary:
			"A portrait-ready digital signage layout built for Appspace cards, reception screens, and event messaging.",
		kicker:
			"Use this page for welcome copy, key messaging, or branded hero announcements.",
		footer: "Need help on-site? Contact the Kinly AV support team.",
		highlights: [
			{
				title: "Simple to duplicate",
				text: "Create new signage variations by adding another page object in the content file.",
			},
			{
				title: "Portrait-first composition",
				text: "The layout keeps a 1080x1920 visual rhythm while scaling to the embedding frame.",
			},
			{
				title: "Appspace-friendly",
				text: "Serve this as a static page and target each slide by query string or autoplay mode.",
			},
		],
		stats: [
			{
				label: "Format",
				value: "1080 x 1920",
			},
			{
				label: "Orientation",
				value: "Portrait",
			},
			{
				label: "Mode",
				value: "Static / Cycle",
			},
		],
	},
	{
		id: "operations",
		eyebrow: "Daily Operations",
		title: "Today at Kinly",
		summary:
			"Use this layout for service updates, room guidance, team briefings, or internal reminders.",
		kicker:
			"Ideal for support desks, operations hubs, and staff-facing digital signage.",
		footer: "Refresh content any time by editing content/pages-data.js.",
		highlights: [
			{
				title: "Morning checks",
				text: "Verify room readiness, signage playback, and audio capture before the first booking.",
			},
			{
				title: "Visitor support",
				text: "Direct guests to reception, lift access, and breakout spaces with concise instructions.",
			},
			{
				title: "Broadcast updates",
				text: "Highlight priority notices, safety messages, or event changes in a format that reads fast.",
			},
		],
		stats: [
			{
				label: "Rooms ready",
				value: "12 / 12",
			},
			{
				label: "First event",
				value: "09:00",
			},
			{
				label: "Support desk",
				value: "Open",
			},
		],
	},
	{
		id: "events",
		eyebrow: "Events & Briefings",
		title: "What's on today",
		summary:
			"A flexible event slide for schedules, speaker highlights, client sessions, or venue wayfinding.",
		kicker:
			"Swap this content per event and point Appspace to the exact page URL you need.",
		footer: "You can also run every page in sequence with ?cycle=true.",
		highlights: [
			{
				title: "10:00 Client showcase",
				text: "Experience Centre live demos and collaboration workflows.",
			},
			{
				title: "13:00 Solutions briefing",
				text: "Hybrid event design, AV operations, and room control best practices.",
			},
			{
				title: "16:30 Team wrap-up",
				text: "Capture actions, reset spaces, and prepare content for the next day.",
			},
		],
		stats: [
			{
				label: "Sessions",
				value: "03",
			},
			{
				label: "Venue",
				value: "London",
			},
			{
				label: "Status",
				value: "Live",
			},
		],
	},
];
