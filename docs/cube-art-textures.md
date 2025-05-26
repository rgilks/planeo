# Cube Art Textures

The application now features a dynamic visual enhancement where each interactive cube in the 3D environment displays a randomly selected piece of art on one of its faces.

## Feature Overview

- **Dynamic Textures:** Each cube that falls and settles in the environment will have a unique artwork textured onto one of its sides.
- **Art Source:** The artworks are sourced from The Metropolitan Museum of Art's Open Access collection. The images have been downloaded and are served locally from the `/public/art/` directory to ensure reliability and avoid CORS issues.
- **Implementation:**
  - The `SyncedRigidBox` component in `src/app/components/Box.tsx` has been updated to accept an `artUrl` prop.
  - It uses the `useTexture` hook from `@react-three/drei` to asynchronously load the image from the provided local URL (e.g., `/art/van-gogh-cypresses.jpg`).
  - The loaded texture is applied as a `meshStandardMaterial` to one face of the `Box` geometry. The other faces retain their original distinct colors.
- **Current Artworks:** The images are served locally from the `/public/art/` directory. The current images are:
  - `image_1.jpg`
  - `image_2.jpg`
  - `image_3.jpg`
  - `image_4.jpg`

## Technical Details

The `ServerDrivenBoxes` component, which manages the creation and state of the falling cubes, now includes logic to select a random image URL from the predefined list (`artImageUrls` in `Box.tsx`) for each new box it generates. This URL is then passed to the `SyncedRigidBox`.

One face of the cube (the `+z` face, which is the front face when the cube is upright) is selected to display the artwork. The `Box` component from `@react-three/drei` allows specifying different materials for each face. We apply the art texture to one material slot and assign distinct solid colors to the other five.

## Future Enhancements

- **Expanded Collection:** The list of artworks could be expanded, or a more dynamic system for fetching and caching a wider variety of images from an API could be implemented (though local serving is currently preferred for stability).
- **User Interaction:** Allow users to select or upload their own images for the cube faces.
- **Texture Controls:** Provide options for texture mapping, such as scaling or offsetting the image on the cube face.
