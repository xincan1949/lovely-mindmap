import {
	App,
	Editor, ItemView, KeymapEventHandler, KeymapEventListener, MarkdownRenderChild,
	MarkdownView,
	Menu,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf
} from 'obsidian'

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

const VIEW_TYPE_EXAMPLE = "example-view";

class ExampleView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Example view";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Example view" });
	}

	async onClose() {
		// Nothing to clean up.
	}
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	canvas: any;
	hShortcut: KeymapEventHandler;
	tabShortcut: KeymapEventHandler;
	cShortcut: KeymapEventHandler;

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: VIEW_TYPE_EXAMPLE,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE)[0]
		);
	}

	// sibNodes must have x,y,height,width attributes
	reflow(parentNode, sibNodes) {
		const ROW_GAP = 20
		const COLUMN_GAP = 200

		const bbox = sibNodes.reduce((prev, node, idx) => {
			return idx > 0
				?	{
					height: prev.height + node.height + ROW_GAP,
					heightNodes: prev.heightNodes.concat(node.height),
				}
				:	{
					height: prev.height + node.height,
					heightNodes: prev.heightNodes.concat(node.height),
				}
		}, {
			height: 0,
			heightNodes: [],
		})

		const top = parentNode.y + parentNode.height * 0.5 - bbox.height * 0.5

		console.log(bbox)

		const getSum = (arr: number[]) => arr.reduce((sum, cur) => sum + cur, 0)

		sibNodes.forEach((node, i) => {
			if (i === 0) {
				node.moveTo({
					x: parentNode.width + parentNode.x + COLUMN_GAP,
					y: top,
				})
				return
			}

			node.moveTo({
				x: parentNode.width + parentNode.x + COLUMN_GAP,
				y: top + ROW_GAP * i + getSum(bbox.heightNodes.slice(0, i))
			})
		})
	}

	async onload() {
		await this.loadSettings();

		this.canvas = app.workspace.getActiveViewOfType(ItemView)?.canvas

		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf)
		);

		this.cShortcut = this.app.scope.register([], 'c', () => {
			// const selections = this.canvas.selection
			// if (selections.size !== 1) return

		})

		const random = (e: number) => {
			let t = [];
			for (let n = 0; n < e; n++) {
				t.push((16 * Math.random() | 0).toString(16));
			}
			return t.join("")
		}

		this.tabShortcut = this.app.scope.register([], 'Tab', () => {
			const selections = this.canvas.selection
			if (selections.size !== 1) return

			const parentNode = selections.values().next().value

			const {
				x,
				y,
				width,
				height,
			} = parentNode

			const sibNodes = this.canvas.getEdgesForNode(parentNode).map(e => e.to.node)

			const childNode = this.canvas.createTextNode({
				pos: {
					x: x + width + 200,
					y: y,
					height: height,
					width: width
				},
				size: {
					x: x + width + 200,
					y: y,
					height: height,
					width: width
				},
				text: "",
				focus: false,
				save: true,
			})

			const data = this.canvas.getData()

			this.canvas.importData({
				"edges": [
					...data.edges,
					{
						"id": random(6),
						"fromNode": parentNode.id,
						"fromSide": 'right',
						"toNode": childNode.id,
						"toSide": 'left',
					}
				],
				"nodes": data.nodes,
			})

			console.log(parentNode)
			console.log(sibNodes)
			console.log('childNode: ', childNode)

			this.reflow(parentNode, sibNodes.concat(childNode))



			// this.canvas.addNode(childNode)


			// this.canvas.requestFrame();
		})

		this.hShortcut = this.app.scope.register([], 'h', () => {
			console.log('canvas => \n\n', this.canvas)
		})

		this.addRibbonIcon("dice", "Activate view", () => {
			this.activateView();
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		this.app.scope.unregister(this.hShortcut)
		this.app.scope.unregister(this.tabShortcut)
		this.app.scope.unregister(this.cShortcut)
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		containerEl.createEl("h1", { text: "Heading 1" });

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
