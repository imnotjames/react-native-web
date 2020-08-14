/**
 * Copyright (c) Nicolas Gallagher.
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

export type ModalPortalProps = {|
  children: any
|};

function ModalPortal(props: ModalPortalProps) {
  const { children } = props;

  // Only create the element once.
  const element = useMemo(() => document.createElement('div'), []);

  useEffect(() => {
    if (document.body) {
      document.body.appendChild(element);
    }

    return () => {
      if (document.body) {
        document.body.removeChild(element);
      }
    }
  }, [element]);

  return ReactDOM.createPortal(children, element);
}

export default ModalPortal;
