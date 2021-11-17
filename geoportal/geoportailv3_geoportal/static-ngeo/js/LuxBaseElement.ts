import {LitElement} from 'lit';
import i18next from 'i18next';


export class LuxBaseElement extends LitElement {
    connectedCallback() {
        this.i18nLanguageChangedCallback_ = () => this.requestUpdate();
        i18next.on("languageChanged", this.i18nLanguageChangedCallback_);
        super.connectedCallback();
    }

    disconnectedCallback() {
        i18next.off("languageChanged", this.i18nLanguageChangedCallback_);
        super.disconnectedCallback();
    }
}
