import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';

/**
 * QuickActionsEditor — admin row editor for the sidebar Quick Actions
 * card. Each row has three text inputs (icon class, label, URL) and a
 * trio of icon buttons (move up / move down / remove). A footer button
 * appends a new row.
 *
 * Values are stored as a JSON-encoded array of {icon, label, href}
 * objects under the `mosaicQuickActions` setting key. The component is
 * mounted via the admin extender's callback-style `.setting()` entry
 * (see js/src/admin/extend.js) which passes a Stream-backed bidi
 * accessor: call `bidi()` to read, `bidi(jsonString)` to write.
 *
 * Empty/incomplete rows are preserved during editing (so the user can
 * type without inputs losing focus) and filtered out at render time on
 * the forum frontend (SidebarPanels.js).
 */
export default class QuickActionsEditor extends Component {
  oninit(vnode) {
    super.oninit(vnode);

    const raw = this.attrs.bidi() || '';
    let parsed = [];
    try {
      parsed = raw ? JSON.parse(raw) : [];
    } catch (e) {
      parsed = [];
    }
    this.actions = Array.isArray(parsed) ? parsed.map((a) => ({ ...a })) : [];
  }

  view() {
    return (
      <div className="Form-group MosaicQuickActionsEditor">
        <label>Quick Actions</label>
        <div className="helpText">
          Sidebar links shown in the Quick Actions widget. Each row needs an icon class
          (e.g. <code>fa-solid fa-bolt</code>), a label, and a URL. Leave the editor empty
          to use built-in defaults (Start a Discussion / Browse Tags / Recent Activity, plus
          Support and Marketplace links when those extensions are detected).
        </div>

        <div className="MosaicQuickActionsEditor-rows">
          {this.actions.length === 0 && (
            <div className="MosaicQuickActionsEditor-empty">
              No custom actions configured — using built-in defaults.
            </div>
          )}
          {this.actions.map((a, i) => this.renderRow(a, i))}
        </div>

        <Button
          className="Button MosaicQuickActionsEditor-add"
          icon="fas fa-plus"
          onclick={() => this.addRow()}
        >
          Add action
        </Button>
      </div>
    );
  }

  renderRow(a, i) {
    return (
      <div className="MosaicQuickActionsEditor-row" key={i}>
        <input
          className="FormControl MosaicQuickActionsEditor-icon"
          placeholder="fa-solid fa-bolt"
          value={a.icon || ''}
          oninput={(e) => this.update(i, 'icon', e.target.value)}
        />
        <input
          className="FormControl MosaicQuickActionsEditor-label"
          placeholder="Label shown to visitors"
          value={a.label || ''}
          oninput={(e) => this.update(i, 'label', e.target.value)}
        />
        <input
          className="FormControl MosaicQuickActionsEditor-href"
          placeholder="/path or https://…"
          value={a.href || ''}
          oninput={(e) => this.update(i, 'href', e.target.value)}
        />
        <div className="MosaicQuickActionsEditor-rowBtns">
          <Button
            className="Button Button--icon"
            icon="fas fa-arrow-up"
            title="Move up"
            disabled={i === 0}
            onclick={() => this.move(i, -1)}
          />
          <Button
            className="Button Button--icon"
            icon="fas fa-arrow-down"
            title="Move down"
            disabled={i === this.actions.length - 1}
            onclick={() => this.move(i, 1)}
          />
          <Button
            className="Button Button--icon Button--danger"
            icon="fas fa-trash"
            title="Remove"
            onclick={() => this.remove(i)}
          />
        </div>
      </div>
    );
  }

  addRow() {
    this.actions.push({ icon: 'fa-solid fa-link', label: '', href: '' });
    this.commit();
  }

  remove(i) {
    this.actions.splice(i, 1);
    this.commit();
  }

  move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= this.actions.length) return;
    const tmp = this.actions[i];
    this.actions[i] = this.actions[j];
    this.actions[j] = tmp;
    this.commit();
  }

  update(i, key, value) {
    this.actions[i] = { ...this.actions[i], [key]: value };
    this.commit();
  }

  /* Write the current array (including blank rows) back through the bidi
   * stream so the page's "save settings" button picks up the dirty state.
   * Filtering happens at the read site (SidebarPanels.js) so that typing
   * mid-edit doesn't drop the row from under the input. */
  commit() {
    this.attrs.bidi(JSON.stringify(this.actions));
  }
}
