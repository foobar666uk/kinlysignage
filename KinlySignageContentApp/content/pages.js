import("./pages-data.js")
	.then(({ PAGES }) => {
		window.KINLY_SIGNAGE_PAGES = PAGES;
	})
	.catch((error) => {
		console.error("Unable to load signage pages:", error);
		window.KINLY_SIGNAGE_PAGES = [];
	});

