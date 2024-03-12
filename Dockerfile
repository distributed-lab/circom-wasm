FROM rust:1.67 as build-stage
RUN wget http://ports.ubuntu.com/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_arm64.deb && dpkg -i libssl1.1_1.1.1f-1ubuntu2_arm64.deb
RUN curl https://raw.githubusercontent.com/second-state/rustwasmc/master/installer/init.sh -sSf | sh
RUN wget https://github.com/WebAssembly/binaryen/releases/download/version_111/binaryen-version_111-x86_64-linux.tar.gz && tar -xvf binaryen-version_111-x86_64-linux.tar.gz -C / --strip-components=1
COPY . /src
RUN rustwasmc build --enable-aot /src/circom
FROM scratch
COPY --from=build-stage /src/target/wasm32-wasi/release/circom.wasm /
