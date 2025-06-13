{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?rev=8f76cf16b17c51ae0cc8e55488069593f6dab645";
  };

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
    in
    {
      devShells."${system}".default =
        let
          pkgs = import nixpkgs {
            inherit system;
          };
        in
        pkgs.mkShell {
          packages = with pkgs; [
            nodejs_23
            nodePackages.pnpm
          ];

          shellHook = ''
            pnpm install --prefer-offline --frozen-lockfile
          '';
        };
    };
}
