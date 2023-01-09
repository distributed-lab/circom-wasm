FROM rust:latest as build-stage
RUN curl https://raw.githubusercontent.com/second-state/rustwasmc/master/installer/init.sh -sSf | sh
RUN wget https://github.com/WebAssembly/binaryen/releases/download/version_111/binaryen-version_111-x86_64-linux.tar.gz && tar -xvf binaryen-version_111-x86_64-linux.tar.gz -C / --strip-components=1
COPY . /src
RUN rustwasmc build --enable-aot /src/circom
FROM scratch
COPY --from=build-stage /src/target/wasm32-wasi/release/circom.wasm /

