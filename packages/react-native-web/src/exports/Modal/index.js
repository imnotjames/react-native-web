/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import React, { forwardRef, useRef, useCallback, useMemo, useEffect } from 'react';

import { canUseDOM } from 'fbjs/lib/ExecutionEnvironment';

import View from '../View';
import StyleSheet from '../StyleSheet';

import type { ModalProps } from './types';

import ModalPortal from './ModalPortal';
import ModalAnimation from './ModalAnimation';
import FocusBracket from './FocusBracket';

function attemptFocus(element: any) {
  try {
    element.focus();
  } catch (e) {
    // Do nothing
  }

  return document.activeElement === element;
}

function focusFirstDescendant(element: any) {
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (attemptFocus(child) || focusFirstDescendant(child)) {
      return true;
    }
  }
  return false;
}

function focusLastDescendant(element: any) {
  for (let i = element.childNodes.length - 1; i >= 0; i--) {
    const child = element.childNodes[i];
    if (attemptFocus(child) || focusLastDescendant(child)) {
      return true;
    }
  }
  return false;
}

let uniqueModalIdentifier = 0;

const visibleModalStack = [];

function isTopModal(modalId) {
  if (visibleModalStack.length === 0) {
    return false;
  }

  return visibleModalStack[visibleModalStack.length - 1] === modalId;
}

const Modal = forwardRef<ModalProps, *>((props, forwardedRef) => {
  const {
    visible,
    animated,
    animationType,
    transparent,
    children,
    onShow: onShowProp,
    onDismiss: onDismissProp,
    onRequestClose: onRequestCloseProp
  } = props;

  const modalElementRef = useRef();

  // Sync the internal ref we track into the forwarded ref
  useEffect(() => {
    if (!forwardedRef) {
      return;
    }

    if (typeof forwardedRef === 'function') {
      forwardedRef(modalElementRef.current);
    } else {
      forwardedRef.current = modalElementRef.current;
    }
  }, [forwardedRef])


  // Set a unique model identifier so we can correctly route
  // dismissals and check the layering of modals.
  const modalId = useMemo(() => uniqueModalIdentifier++, []);

  // Ref used to track trapping of focus and to prevent focus from leaving a modal
  // for accessibility reasons per W3CAG.
  const focusRef = useRef<{ trapFocusInProgress: boolean, lastFocusedElement: ?HTMLElement }>({
    trapFocusInProgress: false,
    lastFocusedElement: null
  });

  const onDismiss = useCallback(() => {
    // When we dismiss we can't assume that we're dismissing the
    // top element in the stack - so search the stack and remove
    // ourselves from it if need be.
    if (visibleModalStack.indexOf(modalId) !== -1) {
      visibleModalStack.splice(visibleModalStack.indexOf(modalId), 1);
    }

    if (onDismissProp) {
      onDismissProp();
    }
  }, [modalId, onDismissProp]);

  const onShow = useCallback(() => {
    visibleModalStack.push(modalId);

    if (onShowProp) {
      onShowProp();
    }
  }, [modalId, onShowProp]);

  const trapFocus = useCallback((e: FocusEvent) => {
    // If the modal isn't currently visible it shouldn't trap focus.
    if (!visible) {
      return;
    }

    // If this isn't the top modal we won't be counting it
    // for trapping focus.
    if (!isTopModal(modalId)) {
      return;
    }

    // Given that we re-focus as part of trapping focus,
    // we don't run to run this functionality while we're already
    // running it.
    if (focusRef.current.trapFocusInProgress) {
      return;
    }

    // If the underlying modal element reference hasn't been set yet
    // we can't do much with trapping focus.
    if (!modalElementRef.current) {
      return;
    }

    try {
      focusRef.current.trapFocusInProgress = true;

      // Only muck with the focus if the event target isn't within this modal
      if (e.target instanceof Node && !modalElementRef.current.contains(e.target)) {
        // To handle keyboard focusing we can make an assumption here.
        // If you're tabbing through the focusable elements, the previously
        // active element will either be the first or the last.
        //
        // If the previously selected element is the "first" descendant
        // and we're leaving it - this means that we should
        // be looping around to the other side of the modal.
        focusFirstDescendant(modalElementRef.current);
        if (focusRef.current.lastFocusedElement === document.activeElement) {
          focusLastDescendant(modalElementRef.current);
        }
      }
    } finally {
      focusRef.current.trapFocusInProgress = false;
    }

    focusRef.current.lastFocusedElement = document.activeElement;
  }, [modalId, visible, modalElementRef]);

  const closeOnEscape = useCallback((e: KeyboardEvent) => {
    if (!visible) {
      return;
    }

    if (!isTopModal(modalId)) {
      return;
    }

    if (e.key === 'Escape') {
      e.stopPropagation();

      if (onRequestCloseProp) {
        onRequestCloseProp();
      }
    }
  }, [modalId, visible, onRequestCloseProp]);

  // Bind to the document itself for this component
  useEffect(() => {
    if (canUseDOM) {
      document.addEventListener('keyup', closeOnEscape, false);
      document.addEventListener('focus', trapFocus, true);
    }

    return () => {
      if (canUseDOM) {
        document.removeEventListener('keyup', closeOnEscape, false);
        document.removeEventListener('focus', trapFocus, true);
      }
    };
  }, [closeOnEscape, trapFocus]);

  const backgroundStyle = transparent ? styles.modalTransparent : styles.modalOpaque;

  return (
    <ModalPortal>
      <ModalAnimation
        animated={animated}
        animationType={animationType}
        onDismiss={onDismiss}
        onShow={onShow}
        style={[styles.modal, backgroundStyle]}
        visible={visible}
      >
        <FocusBracket />
        <View accessibilityRole="dialog" aria-modal ref={modalElementRef}>
          <View style={[styles.container]}>{children}</View>
        </View>
        <FocusBracket />
      </ModalAnimation>
    </ModalPortal>
  );
});

const styles = StyleSheet.create({
  modal: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999
  },
  modalTransparent: {
    backgroundColor: 'transparent'
  },
  modalOpaque: {
    backgroundColor: 'white'
  },
  container: {
    top: 0,
    flex: 1
  }
});

export default Modal;
