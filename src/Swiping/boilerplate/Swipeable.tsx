import type { PanGestureHandlerGestureEvent } from "react-native-gesture-handler";
import { PanGestureHandler } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Dimensions, StyleSheet } from "react-native";
import { snapPoint } from "react-native-redash";
import type { Ref } from "react";
import { forwardRef, useImperativeHandle } from "react";

import type { ProfileModel } from "./Profile";
import { A, Profile } from "./Profile";

interface SwiperProps {
  onSwipe: () => void;
  profile: ProfileModel;
  onTop: boolean;
  scale: SharedValue<number>;
}

const spanPoints = [-A, 0, A];
const { width } = Dimensions.get("window");

const swipe = (
  translateX: Animated.SharedValue<number>,
  dest: number,
  velocity: number,
  onSwipe: () => void
) => {
  "worklet";
  translateX.value = withSpring(
    dest,
    {
      velocity,
      restSpeedThreshold: dest === 0 ? 0.01 : 100,
    },
    () => {
      if (dest !== 0) {
        runOnJS(onSwipe)();
      }
    }
  );
};

export interface Swipeable {
  swipeLeft: () => void;
  swipeRight: () => void;
}

type Offset = {
  x: number;
  y: number;
};

export const Swipeable = forwardRef(
  ({ profile, onTop, onSwipe, scale }: SwiperProps, ref: Ref<Swipeable>) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      swipeLeft: () => {
        swipe(translateX, -A, 25, onSwipe);
      },
      swipeRight: () => {
        swipe(translateX, A, 25, onSwipe);
      },
    }));

    const onGestureEvent = useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      Offset
    >({
      onStart: (_, ctx) => {
        ctx.x = translateX.value;
        ctx.y = translateY.value;
      },
      onActive: ({ translationX, translationY }, ctx) => {
        translateX.value = translationX + ctx.x;
        translateY.value = translationY + ctx.y;
        scale.value = interpolate(
          translateX.value,
          [-width / 2, 0, width / 2],
          [1, 0.95, 1],
          Extrapolate.CLAMP
        );
      },
      onEnd: ({ velocityX, velocityY }) => {
        const dest = snapPoint(translateX.value, velocityX, spanPoints);
        swipe(translateX, dest, velocityX, onSwipe);
        translateY.value = withSpring(0, { velocity: velocityY });
      },
    });

    return (
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <Animated.View style={StyleSheet.absoluteFill}>
          <Profile
            profile={profile}
            onTop={onTop}
            translateX={translateX}
            translateY={translateY}
            scale={scale}
          />
        </Animated.View>
      </PanGestureHandler>
    );
  }
);
