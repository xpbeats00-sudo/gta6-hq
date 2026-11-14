import React from 'react';
import {Composition} from 'remotion';
import {TitleCard} from './TitleCard';

// One composition per output shape, so the same card renders in 16:9, 9:16 and 1:1.
const shapes = [
  {id: 'TitleCard', width: 1920, height: 1080},
  {id: 'TitleCardVertical', width: 1080, height: 1920},
  {id: 'TitleCardSquare', width: 1080, height: 1080},
];

export const Root: React.FC = () => (
  <>
    {shapes.map((s) => (
      <Composition
        key={s.id}
        id={s.id}
        component={TitleCard}
        durationInFrames={120}
        fps={30}
        width={s.width}
        height={s.height}
        defaultProps={{kicker: 'Unofficial fan project', title: 'GTA 6 HQ', subtitle: 'A fan-made encyclopedia and Field Manual'}}
      />
    ))}
  </>
);
