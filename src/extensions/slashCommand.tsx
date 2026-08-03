import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import SlashMenuList from '../components/SlashMenuList';
import { getSlashCommandItems, type SlashItem, type SlashCommandArgs } from './slashCommandItems';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: SlashCommandArgs['editor']; range: SlashCommandArgs['range']; props: SlashItem }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) =>
          getSlashCommandItems()
            .filter((item) => item.titleKey.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10),
        render: () => {
          let component: ReactRenderer;
          let popupEl: HTMLDivElement;

          const positionPopup = (props: SuggestionProps<SlashItem>) => {
            const rect = props.clientRect?.();
            if (!rect || !popupEl) return;
            popupEl.style.left = `${rect.left}px`;
            popupEl.style.top = `${rect.bottom + 4}px`;
          };

          return {
            onStart: (props: SuggestionProps<SlashItem>) => {
              component = new ReactRenderer(SlashMenuList, { props, editor: props.editor });
              popupEl = document.createElement('div');
              popupEl.style.position = 'fixed';
              popupEl.style.zIndex = '200';
              document.body.appendChild(popupEl);
              popupEl.appendChild(component.element);
              positionPopup(props);
            },
            onUpdate: (props: SuggestionProps<SlashItem>) => {
              component.updateProps(props);
              positionPopup(props);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                popupEl.remove();
                return true;
              }
              return (component.ref as { onKeyDown: (p: SuggestionKeyDownProps) => boolean })?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popupEl.remove();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});