import Component, { ComponentAttrs } from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import type Mithril from 'mithril';

interface QuickAction {
  icon?: string;
  label?: string;
  href?: string;
}

interface QuickActionsEditorAttrs extends ComponentAttrs {
  /** Bidi accessor: call with no args to read, with a string to write. */
  valueStream: (value?: string) => string;
}

/**
 * QuickActionsEditor — admin row editor for the sidebar Quick Actions card.
 * Each row has three text inputs (icon class, label, URL) and move/remove
 * buttons. Values are stored as a JSON-encoded array of {icon,label,href}
 * under the `mosaicQuickActions` setting key.
 *
 * The prop is named `valueStream` (not `bidi`) because Mithril 2 intercepts
 * the literal attr name `bidi`. Empty/incomplete rows are preserved during
 * editing (so inputs don't lose focus) and filtered out at the read site
 * (SidebarPanels) on the forum frontend.
 */
export default class QuickActionsEditor extends Component<QuickActionsEditorAttrs> {
  actions: QuickAction[] = [];

  oninit(vnode: Mithril.Vnode<QuickActionsEditorAttrs, this>) {
    super.oninit(vnode);

    const stream = this.attrs.valueStream;
    const raw = (typeof stream === 'function' ? stream() : '') || '';
    let parsed: unknown = [];
    try {
      parsed = raw ? JSON.parse(raw) : [];
    } catch (e) {
      parsed = [];
    }
    this.actions = Array.isArray(parsed) ? (parsed as QuickAction[]).map((a) => ({ ...a })) : [];
  }

  view() {
    return (
      <div className="Form-group MosaicQuickActionsEditor">
        <label>Quick Actions</label>
        <div className="helpText">
          Sidebar links shown in the Quick Actions widget. Each row needs an icon class (e.g. <code>fa-solid fa-bolt</code>), a label, and a URL.
          Leave the editor empty to use built-in defaults (Start a Discussion / Browse Tags / Recent Activity, plus Support and Marketplace links when
          those extensions are detected).
        </div>

        <div className="MosaicQuickActionsEditor-rows">
          {this.actions.length === 0 && <div className="MosaicQuickActionsEditor-empty">No custom actions configured — using built-in defaults.</div>}
          {this.actions.map((a, i) => this.renderRow(a, i))}
        </div>

        <Button className="Button MosaicQuickActionsEditor-add" icon="fas fa-plus" onclick={() => this.addRow()}>
          Add action
        </Button>
      </div>
    );
  }

  renderRow(a: QuickAction, i: number): Mithril.Children {
    return (
      <div className="MosaicQuickActionsEditor-row" key={i}>
        <input
          className="FormControl MosaicQuickActionsEditor-icon"
          placeholder="fa-solid fa-bolt"
          value={a.icon || ''}
          oninput={(e: Event) => this.update(i, 'icon', (e.target as HTMLInputElement).value)}
        />
        <input
          className="FormControl MosaicQuickActionsEditor-label"
          placeholder="Label shown to visitors"
          value={a.label || ''}
          oninput={(e: Event) => this.update(i, 'label', (e.target as HTMLInputElement).value)}
        />
        <input
          className="FormControl MosaicQuickActionsEditor-href"
          placeholder="/path or https://…"
          value={a.href || ''}
          oninput={(e: Event) => this.update(i, 'href', (e.target as HTMLInputElement).value)}
        />
        <div className="MosaicQuickActionsEditor-rowBtns">
          <Button className="Button Button--icon" icon="fas fa-arrow-up" title="Move up" disabled={i === 0} onclick={() => this.move(i, -1)} />
          <Button
            className="Button Button--icon"
            icon="fas fa-arrow-down"
            title="Move down"
            disabled={i === this.actions.length - 1}
            onclick={() => this.move(i, 1)}
          />
          <Button className="Button Button--icon Button--danger" icon="fas fa-trash" title="Remove" onclick={() => this.remove(i)} />
        </div>
      </div>
    );
  }

  addRow(): void {
    this.actions.push({ icon: 'fa-solid fa-link', label: '', href: '' });
    this.commit();
  }

  remove(i: number): void {
    this.actions.splice(i, 1);
    this.commit();
  }

  move(i: number, dir: number): void {
    const j = i + dir;
    if (j < 0 || j >= this.actions.length) return;
    const tmp = this.actions[i];
    this.actions[i] = this.actions[j];
    this.actions[j] = tmp;
    this.commit();
  }

  update(i: number, key: keyof QuickAction, value: string): void {
    this.actions[i] = { ...this.actions[i], [key]: value };
    this.commit();
  }

  /* Write the current array (including blank rows) back through the bidi
   * stream so the page's "save settings" button picks up the dirty state.
   * Filtering happens at the read site (SidebarPanels) so typing mid-edit
   * doesn't drop the row from under the input. */
  commit(): void {
    this.attrs.valueStream(JSON.stringify(this.actions));
  }
}
